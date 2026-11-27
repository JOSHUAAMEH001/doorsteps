import { NextResponse } from "next/server"
import { isSquadConfigured, webhookSignatureMatches } from "@/lib/squad"
import { confirmSquadPayment } from "@/lib/payments/squad-confirm"

export const dynamic = "force-dynamic"

/**
 * Squad webhook (set in Squad Dashboard -> Profile -> API & Webhook):
 *   https://www.doorsteps.com.ng/api/webhooks/squad
 *
 * The webhook is only a hint. Whatever it says, the order is marked paid only after
 * Squad's verify API (called with our secret key) confirms the payment and the amount.
 * So a forged webhook can at most make us check a reference with Squad.
 */
export async function POST(request: Request) {
  if (!isSquadConfigured()) return NextResponse.json({ ok: false, message: "not configured" }, { status: 503 })

  const raw = await request.text()
  if (raw.length > 64_000) return NextResponse.json({ ok: false }, { status: 413 })

  let payload: { Event?: string; TransactionRef?: string; Body?: { transaction_ref?: string } } | null = null
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: false, message: "invalid json" }, { status: 400 })
  }

  const ref = payload?.TransactionRef ?? payload?.Body?.transaction_ref
  if (typeof ref !== "string" || !/^[A-Za-z0-9_-]{6,60}$/.test(ref)) {
    // Not something we can act on; acknowledge so Squad doesn't retry forever.
    return NextResponse.json({ ok: true, ignored: true })
  }

  if (!webhookSignatureMatches(raw, request.headers.get("x-squad-encrypted-body"))) {
    console.warn(`[squad] webhook signature did not match for ref=${ref}; verifying with Squad anyway`)
  }

  const outcome = await confirmSquadPayment(ref)
  if (outcome.state === "error") {
    console.error(`[squad] webhook ref=${ref} failed: ${outcome.detail}`)
    // 500 so Squad retries later (e.g. a temporary network problem).
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  if (outcome.state === "unknown_reference") {
    console.warn(`[squad] webhook for unknown ref=${ref}`)
  }
  return NextResponse.json({ ok: true, state: outcome.state })
}
