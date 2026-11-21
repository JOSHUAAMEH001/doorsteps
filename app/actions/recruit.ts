"use server"

import { createHash } from "node:crypto"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"

/**
 * Pre-launch recruitment forms (customer waitlist, vendor & rider applications).
 *
 * Visitors never touch the tables directly: these actions validate the input,
 * reject bots (honeypot + minimum fill time), then call SECURITY DEFINER
 * database functions that validate again, block duplicate phone numbers and
 * rate-limit per network. See supabase/migrations/20261121_recruitment_forms.sql.
 */

export type SubmitResult = { ok: boolean; duplicate?: boolean; id?: string; error?: string; field?: string }

type Kind = "waitlist" | "vendor" | "rider"

const RPC: Record<Kind, string> = {
  waitlist: "submit_waitlist",
  vendor: "submit_vendor_application",
  rider: "submit_rider_application",
}

const MIN_FILL_MS = 2_500

async function networkHash() {
  const h = await headers()
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || ""
  if (!ip) return null
  // Daily-rotating hash: enough to rate-limit, without storing anyone's IP address.
  const day = new Date().toISOString().slice(0, 10)
  return createHash("sha256").update(`doors-recruit:${day}:${ip}`).digest("hex").slice(0, 32)
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")

/** Fast first-pass checks so obvious mistakes never reach the database. The database re-checks everything. */
function precheck(kind: Kind, p: Record<string, unknown>): SubmitResult | null {
  const need = (field: string, label: string, min = 2) => (str(p[field], 400).length < min ? { ok: false, field, error: label } : null)
  const phone = (field: string, label: string) => {
    const d = str(p[field], 30).replace(/\D/g, "")
    return /^(0|234)?[789][01]\d{8}$/.test(d) ? null : { ok: false, field, error: label }
  }
  const email = () => {
    const e = str(p.email, 254)
    return e && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e) ? { ok: false, field: "email", error: "Check your email address." } : null
  }
  if (kind === "waitlist") {
    return need("full_name", "Enter your full name.") ?? phone("phone", "Enter a valid Nigerian phone number.") ?? email() ?? need("area", "Tell us where you are.", 1)
      ?? (["food", "groceries", "both"].includes(String(p.service)) ? null : { ok: false, field: "service", error: "Choose food, groceries or both." })
  }
  if (kind === "vendor") {
    return need("business_name", "Enter your business name.") ?? need("category", "Choose a business category.", 1) ?? need("owner_name", "Enter the owner's full name.")
      ?? phone("phone", "Enter a valid Nigerian phone number.") ?? email() ?? need("address", "Enter your business location.", 3)
      ?? (p.consent === true ? null : { ok: false, field: "consent", error: "Please agree so we can review your application." })
  }
  return need("full_name", "Enter your full name.") ?? phone("phone", "Enter a valid Nigerian phone number.") ?? email() ?? need("residential_area", "Tell us where you live.")
    ?? (p.is_adult === true ? null : { ok: false, field: "is_adult", error: "Riders must be 18 or older." })
    ?? need("vehicle_type", "Choose your vehicle type.", 1) ?? need("vehicle_access", "Tell us if you own or can use the vehicle.", 1)
    ?? need("availability", "Choose when you can work.", 1) ?? need("emergency_name", "Enter an emergency contact name.")
    ?? phone("emergency_phone", "Enter a valid emergency contact number.")
    ?? (p.consent === true ? null : { ok: false, field: "consent", error: "Please agree so we can review your application." })
}

async function submit(kind: Kind, payload: Record<string, unknown>, meta: { startedAt: number; trap?: string }): Promise<SubmitResult> {
  // Bots fill hidden fields and submit instantly. Humans see a gentle retry message.
  if (meta.trap) return { ok: false, error: "Something went wrong. Please try again." }
  if (!Number.isFinite(meta.startedAt) || Date.now() - meta.startedAt < MIN_FILL_MS) {
    return { ok: false, error: "That was quick! Please check your details and press submit again." }
  }
  if (!payload || typeof payload !== "object" || JSON.stringify(payload).length > 20_000) {
    return { ok: false, error: "That form couldn't be read. Please refresh and try again." }
  }
  const early = precheck(kind, payload)
  if (early) return early

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc(RPC[kind], { p: payload, p_ip_hash: await networkHash() })
    if (error) {
      console.error(`[recruit] ${kind} submit failed`, error)
      if (error.code === "PGRST202" || error.code === "42883") {
        return { ok: false, error: "Sign-ups aren't open just yet. Please try again shortly." }
      }
      return { ok: false, error: "We couldn't save your details. Please check your connection and try again." }
    }
    const result = (data ?? {}) as SubmitResult
    return { ok: Boolean(result.ok), duplicate: result.duplicate, id: result.id, error: result.error, field: result.field }
  } catch (error) {
    console.error(`[recruit] ${kind} submit crashed`, error)
    return { ok: false, error: "We couldn't save your details. Please check your connection and try again." }
  }
}

export async function submitWaitlist(payload: Record<string, unknown>, meta: { startedAt: number; trap?: string }) {
  return submit("waitlist", payload, meta)
}

export async function submitVendorApplication(payload: Record<string, unknown>, meta: { startedAt: number; trap?: string }) {
  return submit("vendor", payload, meta)
}

export async function submitRiderApplication(payload: Record<string, unknown>, meta: { startedAt: number; trap?: string }) {
  return submit("rider", payload, meta)
}

/** Records how many files reached storage for an application (shown to admins). */
export async function finalizeApplicationFiles(kind: "vendor" | "rider", id: string): Promise<number> {
  if (!/^[0-9a-f-]{36}$/.test(id) || (kind !== "vendor" && kind !== "rider")) return 0
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("finalize_application_files", { p_kind: kind, p_id: id })
    if (error) {
      console.error("[recruit] finalize failed", error)
      return 0
    }
    return Number(data ?? 0)
  } catch {
    return 0
  }
}
