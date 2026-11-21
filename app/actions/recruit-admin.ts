"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Admin-only review of pre-launch sign-ups. Every action re-checks the admin
 * role; Supabase RLS (is_admin()) enforces the same rule on the tables and on
 * the private "applications" storage bucket.
 */

export type WaitlistSignup = {
  id: string; created_at: string; full_name: string; phone: string; email: string | null; area: string
  service: string; whatsapp: string | null; favourite: string | null; comments: string | null; status: string; admin_notes: string | null
}
export type VendorApplication = {
  id: string; created_at: string; business_name: string; category: string; owner_name: string; phone: string; whatsapp: string | null
  email: string | null; address: string; landmark: string | null; description: string | null; operating_hours: string | null
  social_link: string | null; menu_text: string | null; products: { name: string; price: number | null }[]; registration_status: string
  contact_method: string; files_uploaded: number; status: string; admin_notes: string | null
}
export type RiderApplication = {
  id: string; created_at: string; full_name: string; phone: string; whatsapp: string | null; email: string | null; residential_area: string
  vehicle_type: string; vehicle_access: string; availability: string; experience: string | null; emergency_name: string
  emergency_phone: string; files_uploaded: number; status: string; admin_notes: string | null
}
export type RecruitmentData = { waitlist: WaitlistSignup[]; vendors: VendorApplication[]; riders: RiderApplication[]; setupNeeded: boolean }

const EMPTY: RecruitmentData = { waitlist: [], vendors: [], riders: [], setupNeeded: false }
const TABLES = { waitlist: "waitlist_signups", vendor: "vendor_applications", rider: "rider_applications" } as const
const STATUSES = {
  waitlist: ["new", "contacted", "archived"],
  vendor: ["new", "reviewing", "approved", "rejected"],
  rider: ["new", "reviewing", "shortlisted", "approved", "rejected"],
} as const

async function adminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  return data?.role === "admin" ? supabase : null
}

export async function getRecruitment(): Promise<{ data: RecruitmentData; error: string | null }> {
  const supabase = await adminClient()
  if (!supabase) return { data: EMPTY, error: "You don't have permission to view this." }
  try {
    const [w, v, r] = await Promise.all([
      supabase.from(TABLES.waitlist).select("id, created_at, full_name, phone, email, area, service, whatsapp, favourite, comments, status, admin_notes").order("created_at", { ascending: false }).limit(2000),
      supabase.from(TABLES.vendor).select("id, created_at, business_name, category, owner_name, phone, whatsapp, email, address, landmark, description, operating_hours, social_link, menu_text, products, registration_status, contact_method, files_uploaded, status, admin_notes").order("created_at", { ascending: false }).limit(1000),
      supabase.from(TABLES.rider).select("id, created_at, full_name, phone, whatsapp, email, residential_area, vehicle_type, vehicle_access, availability, experience, emergency_name, emergency_phone, files_uploaded, status, admin_notes").order("created_at", { ascending: false }).limit(1000),
    ])
    const err = w.error ?? v.error ?? r.error
    if (err) {
      // 42P01 / PGRST205: tables not created yet (migration not applied).
      if (err.code === "42P01" || err.code === "PGRST205") return { data: { ...EMPTY, setupNeeded: true }, error: null }
      console.error("[recruit-admin] load failed", err)
      return { data: EMPTY, error: "Couldn't load sign-ups. Please try again." }
    }
    return { data: { waitlist: (w.data ?? []) as WaitlistSignup[], vendors: (v.data ?? []) as VendorApplication[], riders: (r.data ?? []) as RiderApplication[], setupNeeded: false }, error: null }
  } catch (error) {
    console.error("[recruit-admin] load crashed", error)
    return { data: EMPTY, error: "Couldn't load sign-ups. Please try again." }
  }
}

export async function updateRecruitStatus(kind: keyof typeof TABLES, id: string, status: string, notes?: string): Promise<{ error: string | null }> {
  const supabase = await adminClient()
  if (!supabase) return { error: "You don't have permission to do that." }
  if (!(STATUSES[kind] as readonly string[]).includes(status)) return { error: "Unknown status." }
  const values: { status: string; admin_notes?: string | null } = { status }
  if (notes !== undefined) values.admin_notes = notes.trim().slice(0, 1000) || null
  const { data, error } = await supabase.from(TABLES[kind]).update(values).eq("id", id).select("id").maybeSingle()
  if (error) {
    console.error("[recruit-admin] update failed", error)
    return { error: "Couldn't save. Please try again." }
  }
  return data ? { error: null } : { error: "That record no longer exists." }
}

/** Lists an application's private files with 10-minute signed links. */
export async function getApplicationFiles(kind: "vendor" | "rider", id: string): Promise<{ data: { name: string; url: string }[]; error: string | null }> {
  const supabase = await adminClient()
  if (!supabase) return { data: [], error: "You don't have permission to view this." }
  if (!/^[0-9a-f-]{36}$/.test(id)) return { data: [], error: "Invalid application." }
  const folder = `${kind}/${id}`
  const { data: files, error } = await supabase.storage.from("applications").list(folder, { limit: 50 })
  if (error) return { data: [], error: "Couldn't load files." }
  if (!files?.length) return { data: [], error: null }
  const paths = files.map((f) => `${folder}/${f.name}`)
  const { data: signed, error: signError } = await supabase.storage.from("applications").createSignedUrls(paths, 600)
  if (signError) return { data: [], error: "Couldn't open files." }
  return {
    data: (signed ?? []).filter((s) => s.signedUrl && s.path).map((s) => ({ name: s.path!.split("/").pop() ?? "file", url: s.signedUrl! })),
    error: null,
  }
}
