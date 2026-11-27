import { createAdminClient } from "@/lib/supabase/admin"
import { decidePayment, verifySquadTransaction } from "@/lib/squad"

export type ConfirmOutcome =
  | { state: "paid"; orderCode: string; alreadyPaid: boolean }
  | { state: "pending"; orderCode: string | null }
  | { state: "not_paid"; orderCode: string | null; squadStatus: string }
  | { state: "unknown_reference" }
  | { state: "needs_review"; orderCode: string | null; detail: string }
  | { state: "error"; detail: string }

/**
 * Confirms an online payment for the order that holds this Squad reference.
 * Always re-checks with Squad's verify API; redirects and webhooks are only hints.
 * Safe to call any number of times: the order is only ever moved unpaid -> paid once.
 */
export async function confirmSquadPayment(transactionRef: string): Promise<ConfirmOutcome> {
  const admin = createAdminClient()
  if (!admin) return { state: "error", detail: "server payment access is not configured" }

  const { data: order, error: readError } = await admin
    .from("orders")
    .select("id, order_code, total, payment_method, payment_status, payment_reference, status")
    .eq("payment_reference", transactionRef)
    .maybeSingle()
  if (readError) return { state: "error", detail: `order lookup: ${readError.message}` }
  if (!order) return { state: "unknown_reference" }
  if (order.payment_status === "paid") return { state: "paid", orderCode: order.order_code, alreadyPaid: true }

  const checked = await verifySquadTransaction(transactionRef)
  if (!checked.ok) {
    return checked.notFound
      ? { state: "not_paid", orderCode: order.order_code, squadStatus: "Not started" }
      : { state: "error", detail: checked.reason }
  }

  const decision = decidePayment(checked.verification, { total: Number(order.total), paymentReference: order.payment_reference })
  if (decision.result === "pending") return { state: "pending", orderCode: order.order_code }
  if (decision.result === "not_paid") return { state: "not_paid", orderCode: order.order_code, squadStatus: decision.status }
  if (decision.result === "mismatch") {
    console.error(`[squad] payment needs review order=${order.order_code} ref=${transactionRef}: ${decision.detail}`)
    return { state: "needs_review", orderCode: order.order_code, detail: decision.detail }
  }

  const { data: updated, error: updateError } = await admin
    .from("orders")
    .update({ payment_status: "paid", paid_at: new Date().toISOString(), amount_paid: decision.amountNaira })
    .eq("id", order.id)
    .eq("payment_reference", transactionRef)
    .eq("payment_status", "unpaid")
    .select("id")
    .maybeSingle()
  if (updateError) return { state: "error", detail: `mark paid: ${updateError.message}` }
  if (!updated) {
    // Another request (webhook or redirect) confirmed it a moment ago.
    return { state: "paid", orderCode: order.order_code, alreadyPaid: true }
  }
  console.info(`[squad] order ${order.order_code} paid ref=${transactionRef}`)
  return { state: "paid", orderCode: order.order_code, alreadyPaid: false }
}
