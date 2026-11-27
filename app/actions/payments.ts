"use server"

import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { initiateSquadPayment, isSquadConfigured, isSquadSandbox, nairaToKobo, newTransactionRef } from "@/lib/squad"
import { confirmSquadPayment, type ConfirmOutcome } from "@/lib/payments/squad-confirm"

const SITE_URL = "https://www.doorsteps.com.ng"

/** Whether checkout can offer "Pay online" (Squad key set and server can record payments). */
export async function getOnlinePaymentStatus(): Promise<{ enabled: boolean; sandbox: boolean }> {
  const enabled = isSquadConfigured() && createAdminClient() !== null
  return { enabled, sandbox: enabled && isSquadSandbox() }
}

/** Where Squad sends the customer back to: this site only, never an arbitrary host. */
async function returnOrigin() {
  const h = await headers()
  const origin = h.get("origin") ?? ""
  if (/^https:\/\/(www\.)?doorsteps\.com\.ng$/.test(origin)) return origin
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) && process.env.VERCEL_ENV !== "production") return origin
  // Local development, or local tests against a mock Squad API.
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  if (local && (process.env.NODE_ENV !== "production" || process.env.SQUAD_API_BASE_URL)) return origin
  return SITE_URL
}

export type StartPaymentResult = { ok: true; checkoutUrl: string } | { ok: false; message: string; alreadyPaid?: boolean }

/**
 * Starts (or restarts) online payment for one of the signed-in customer's own orders.
 * The amount is always the order total stored in the database, never a number from the browser.
 */
export async function startOnlinePayment(orderCode: string): Promise<StartPaymentResult> {
  if (!isSquadConfigured()) return { ok: false, message: "Online payment isn't available right now. Please choose another payment method." }
  const admin = createAdminClient()
  if (!admin) return { ok: false, message: "Online payment isn't available right now. Please choose another payment method." }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Please sign in again to pay for your order." }
  if (!user.email) return { ok: false, message: "Add an email address to your account to pay online." }

  // Read through the customer's own session, so RLS guarantees it is their order.
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, order_code, customer_name, total, payment_method, payment_status, status")
    .eq("order_code", orderCode.trim())
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) {
    console.error("[squad] start: order lookup failed", error.code ?? error.message)
    return { ok: false, message: "We couldn't load your order. Please try again." }
  }
  if (!order) return { ok: false, message: "We couldn't find that order on your account." }
  if (order.payment_method !== "card") return { ok: false, message: "This order isn't set up for online payment." }
  if (order.payment_status === "paid") return { ok: false, message: "This order is already paid.", alreadyPaid: true }
  if (order.status === "cancelled") return { ok: false, message: "This order was cancelled, so it can't be paid." }

  const amountKobo = nairaToKobo(Number(order.total))
  if (!Number.isInteger(amountKobo) || amountKobo < 100) return { ok: false, message: "This order total can't be paid online. Please contact support." }

  // A fresh reference for every attempt; the order remembers the latest one.
  const transactionRef = newTransactionRef(order.order_code)
  const { data: saved, error: saveError } = await admin
    .from("orders")
    .update({ payment_reference: transactionRef })
    .eq("id", order.id)
    .eq("payment_status", "unpaid")
    .select("id")
    .maybeSingle()
  if (saveError || !saved) {
    console.error("[squad] start: could not save reference", saveError?.message ?? "order changed")
    return { ok: false, message: "We couldn't start the payment. Please try again." }
  }

  const callbackUrl = `${await returnOrigin()}/payment/squad?ref=${encodeURIComponent(transactionRef)}`
  const started = await initiateSquadPayment({
    amountKobo,
    email: user.email,
    customerName: order.customer_name ?? "DOORS customer",
    transactionRef,
    callbackUrl,
    orderCode: order.order_code,
  })
  if (!started.ok) {
    console.error(`[squad] start failed order=${order.order_code}: ${started.reason}`)
    return { ok: false, message: "We couldn't open the payment page. Your order is saved; please try again in a moment." }
  }
  return { ok: true, checkoutUrl: started.checkoutUrl }
}

/**
 * Used by the page Squad redirects back to. Only the order's own customer can check it,
 * and the answer always comes from Squad's verify API, never from the redirect itself.
 */
export async function checkOnlinePayment(transactionRef: string): Promise<ConfirmOutcome | { state: "signed_out" }> {
  if (typeof transactionRef !== "string" || !/^[A-Za-z0-9_-]{6,60}$/.test(transactionRef)) return { state: "unknown_reference" }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { state: "signed_out" }
  const { data: own } = await supabase
    .from("orders")
    .select("id")
    .eq("payment_reference", transactionRef)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!own) return { state: "unknown_reference" }
  return confirmSquadPayment(transactionRef)
}
