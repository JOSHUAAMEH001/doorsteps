import { createHmac, timingSafeEqual } from "crypto"

/**
 * Squad (GTCO / HabariPay) payment gateway: server-side only.
 *
 * Set SQUAD_SECRET_KEY in Vercel to switch online payments on. A key starting with
 * "sandbox_sk_" talks to Squad's sandbox; any other key talks to the live API.
 * Docs: https://docs.squadco.com (Initiate payment, Verify transaction, Webhook).
 */

const SANDBOX_URL = "https://sandbox-api-d.squadco.com"
const LIVE_URL = "https://api-d.squadco.com"

export type SquadStatus = "Success" | "Failed" | "Abandoned" | "Pending" | (string & {})

export type SquadVerification = {
  transactionRef: string
  status: SquadStatus
  /** Amount in kobo, as Squad reports it. */
  amountKobo: number
  currency: string
  transactionType: string | null
}

function secretKey() {
  return process.env.SQUAD_SECRET_KEY?.trim() || null
}

/** Online payment is available only when a Squad secret key is configured. */
export function isSquadConfigured() {
  return Boolean(secretKey())
}

export function isSquadSandbox() {
  return secretKey()?.startsWith("sandbox_sk_") ?? true
}

function baseUrl() {
  // SQUAD_API_BASE_URL is only for tests against a local mock; never set it in production.
  return process.env.SQUAD_API_BASE_URL?.replace(/\/+$/, "") || (isSquadSandbox() ? SANDBOX_URL : LIVE_URL)
}

/** Naira to kobo, rounded to the nearest kobo. */
export function nairaToKobo(naira: number) {
  return Math.round(Number(naira) * 100)
}

/** Squad transaction references: letters and digits only, unique per payment attempt. */
export function newTransactionRef(orderCode: string) {
  const code = orderCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase().replace(/^DRS/, "").slice(0, 20)
  const stamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `DRS${code}${stamp}${random}`.slice(0, 50)
}

async function squadFetch(path: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const key = secretKey()
  if (!key) throw new Error("Squad is not configured")
  const { timeoutMs = 12_000, ...rest } = init
  return fetch(`${baseUrl()}${path}`, {
    ...rest,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json", ...rest.headers },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  })
}

export type InitiateInput = {
  amountKobo: number
  email: string
  customerName: string
  transactionRef: string
  callbackUrl: string
  orderCode: string
}

/** Starts a Squad checkout and returns the hosted payment page URL. */
export async function initiateSquadPayment(input: InitiateInput): Promise<{ ok: true; checkoutUrl: string } | { ok: false; reason: string }> {
  try {
    const response = await squadFetch("/transaction/initiate", {
      method: "POST",
      body: JSON.stringify({
        amount: input.amountKobo,
        email: input.email,
        currency: "NGN",
        initiate_type: "inline",
        transaction_ref: input.transactionRef,
        customer_name: input.customerName.slice(0, 80),
        callback_url: input.callbackUrl,
        payment_channels: ["card", "transfer", "ussd", "bank"],
        metadata: { order_code: input.orderCode },
        // DOORS absorbs Squad's fee; customers pay the order total shown at checkout.
        pass_charge: false,
      }),
    })
    const body = (await response.json().catch(() => null)) as { success?: boolean; message?: string; data?: { checkout_url?: string } } | null
    const checkoutUrl = body?.data?.checkout_url
    if (!response.ok || !body?.success || typeof checkoutUrl !== "string" || !/^https:\/\//.test(checkoutUrl)) {
      return { ok: false, reason: `initiate ${response.status}: ${body?.message ?? "no checkout_url"}` }
    }
    return { ok: true, checkoutUrl }
  } catch (error) {
    return { ok: false, reason: `initiate error: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/**
 * Asks Squad for the real status of a transaction. This is the only thing DOORS trusts:
 * redirects and webhooks just tell us which reference to check.
 */
export async function verifySquadTransaction(transactionRef: string): Promise<{ ok: true; verification: SquadVerification } | { ok: false; reason: string; notFound?: boolean }> {
  if (!/^[A-Za-z0-9_-]{6,60}$/.test(transactionRef)) return { ok: false, reason: "invalid reference", notFound: true }
  try {
    const response = await squadFetch(`/transaction/verify/${encodeURIComponent(transactionRef)}`, { method: "GET" })
    const body = (await response.json().catch(() => null)) as {
      success?: boolean
      message?: string
      data?: { transaction_ref?: string; transaction_status?: string; transaction_amount?: number | string; transaction_currency_id?: string; transaction_type?: string }
    } | null
    if (response.status === 400) return { ok: false, reason: body?.message ?? "invalid reference", notFound: true }
    const data = body?.data
    if (!response.ok || !body?.success || !data?.transaction_status) {
      return { ok: false, reason: `verify ${response.status}: ${body?.message ?? "no data"}` }
    }
    return {
      ok: true,
      verification: {
        transactionRef: data.transaction_ref ?? transactionRef,
        status: data.transaction_status,
        amountKobo: Number(data.transaction_amount),
        currency: data.transaction_currency_id ?? "",
        transactionType: data.transaction_type ?? null,
      },
    }
  } catch (error) {
    return { ok: false, reason: `verify error: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/**
 * Checks Squad's x-squad-encrypted-body header (HMAC-SHA512 of the raw body with the secret key).
 * Used only for logging: a payment is never trusted because of a webhook, it is always verified
 * with verifySquadTransaction first.
 */
export function webhookSignatureMatches(rawBody: string, header: string | null) {
  const key = secretKey()
  if (!key || !header) return false
  const expected = createHmac("sha512", key).update(rawBody).digest("hex")
  const given = header.trim().toLowerCase()
  if (given.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

export type PaymentDecision =
  | { result: "paid"; amountNaira: number }
  | { result: "pending" }
  | { result: "not_paid"; status: string }
  | { result: "mismatch"; detail: string }

/** Decides what a verified Squad transaction means for an order. Pure, so it can be unit-tested. */
export function decidePayment(verification: SquadVerification, order: { total: number; paymentReference: string | null }): PaymentDecision {
  if (order.paymentReference && verification.transactionRef !== order.paymentReference) {
    return { result: "mismatch", detail: "reference differs from the order" }
  }
  const status = String(verification.status).toLowerCase()
  if (status === "pending") return { result: "pending" }
  if (status !== "success") return { result: "not_paid", status: verification.status }
  if (verification.currency.toUpperCase() !== "NGN") return { result: "mismatch", detail: `currency ${verification.currency}` }
  const expected = nairaToKobo(order.total)
  if (!Number.isFinite(verification.amountKobo) || verification.amountKobo < expected) {
    return { result: "mismatch", detail: `paid ${verification.amountKobo} kobo, expected ${expected}` }
  }
  return { result: "paid", amountNaira: verification.amountKobo / 100 }
}
