"use client"

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Clock, LoaderCircle, XCircle } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { checkOnlinePayment, startOnlinePayment } from "@/app/actions/payments"

type Outcome = Awaited<ReturnType<typeof checkOnlinePayment>>

const PRIMARY = "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-bold text-brand-foreground disabled:opacity-60"
const LINK = "rounded-sm text-center text-sm font-semibold text-brand hover:underline"

const POLL_MS = 4_000
const MAX_POLLS = 30 // about 2 minutes

function PaymentResult() {
  const ref = useSearchParams().get("ref") ?? ""
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [checkFailed, setCheckFailed] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState("")
  const polls = useRef(0)
  const [gaveUp, setGaveUp] = useState(false)

  const check = useCallback(async () => {
    try {
      const result = await checkOnlinePayment(ref)
      setCheckFailed(false)
      setOutcome(result)
      return result
    } catch {
      setCheckFailed(true)
      return null
    }
  }, [ref])

  // Check now, then keep checking while Squad reports the payment as pending.
  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    async function run() {
      const result = await check()
      if (cancelled) return
      const keepWaiting = !result || result.state === "pending" || result.state === "error"
      if (!keepWaiting) return
      if (polls.current < MAX_POLLS) {
        polls.current += 1
        timer = window.setTimeout(run, POLL_MS)
      } else {
        setGaveUp(true)
      }
    }
    void run()
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [check])

  const orderCode = outcome && "orderCode" in outcome ? outcome.orderCode : null
  const trackHref = orderCode ? `/?track=${encodeURIComponent(orderCode)}` : "/"

  async function retry() {
    if (!orderCode || retrying) return
    setRetrying(true)
    setRetryError("")
    try {
      const started = await startOnlinePayment(orderCode)
      if (started.ok) {
        window.location.assign(started.checkoutUrl)
        return
      }
      if (started.alreadyPaid) { void check() }
      setRetryError(started.message)
    } catch {
      setRetryError("We couldn't reach the payment service. Check your connection and try again.")
    }
    setRetrying(false)
  }

  let icon = <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-brand" />
  let title = "Checking your payment…"
  let body = "This takes a few seconds. Please don't close this page."
  let actions: ReactNode = null

  if (!ref) {
    icon = <XCircle aria-hidden="true" className="size-8 text-destructive" />
    title = "No payment to check"
    body = "This page is opened after paying online. Open your order in DOORS to see its status."
    actions = <Link href="/" className={PRIMARY}>Go to DOORS</Link>
  } else if (outcome?.state === "paid") {
    icon = <CheckCircle2 aria-hidden="true" className="size-8 text-success" />
    title = "Payment received"
    body = `Thank you! Order ${outcome.orderCode} is paid and has been sent to the restaurant.`
    actions = <Link href={trackHref} className={PRIMARY}>Track your order</Link>
  } else if (outcome?.state === "pending" || (outcome?.state === "error" && !gaveUp) || (checkFailed && !gaveUp)) {
    icon = <Clock aria-hidden="true" className="size-8 text-warning-strong" />
    title = "Waiting for your bank"
    body = "Your payment is still being processed. This page updates by itself. If you paid by transfer, it can take a minute or two."
  } else if (outcome?.state === "not_paid") {
    icon = <XCircle aria-hidden="true" className="size-8 text-destructive" />
    title = "Payment not completed"
    body = `Your order ${outcome.orderCode ?? ""} is saved, but we haven't received the payment. No money was taken for it. You can try again.`
    actions = (
      <>
        <button type="button" onClick={retry} disabled={retrying} className={PRIMARY}>
          {retrying ? <><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Opening payment…</> : "Try paying again"}
        </button>
        <Link href={trackHref} className={LINK}>View my order</Link>
      </>
    )
  } else if (outcome?.state === "needs_review") {
    icon = <Clock aria-hidden="true" className="size-8 text-warning-strong" />
    title = "We're checking your payment"
    body = `We received a payment for order ${outcome.orderCode ?? ""} that our team needs to check. Please don't pay again; we'll confirm it shortly.`
    actions = <Link href={trackHref} className={PRIMARY}>View my order</Link>
  } else if (outcome?.state === "signed_out") {
    icon = <XCircle aria-hidden="true" className="size-8 text-destructive" />
    title = "Log in to see your payment"
    body = "Log in with the account you ordered with. If you paid, your payment is safe and will show on your order."
    actions = <Link href="/?auth=login" className={PRIMARY}>Log in</Link>
  } else if (outcome?.state === "unknown_reference") {
    icon = <XCircle aria-hidden="true" className="size-8 text-destructive" />
    title = "We couldn't find this payment"
    body = "Check your order in DOORS. If money left your account, contact support with the reference below."
    actions = <Link href="/" className={PRIMARY}>Go to DOORS</Link>
  } else if (outcome?.state === "error" || checkFailed) {
    icon = <Clock aria-hidden="true" className="size-8 text-warning-strong" />
    title = "We couldn't confirm your payment yet"
    body = "If you paid, don't pay again. Your order updates automatically once the payment is confirmed. Check your order in a few minutes, or contact support."
    actions = <Link href={trackHref} className={PRIMARY}>View my order</Link>
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-secondary px-4 py-8 text-foreground sm:px-6">
      <section className="w-full max-w-md rounded-[2rem] border border-border/80 bg-card p-6 text-center shadow-xl shadow-foreground/[0.04] sm:p-8">
        <div className="flex justify-center"><Logo size="md" /></div>
        <div className="mt-8 flex justify-center">{icon}</div>
        <h1 role="status" aria-live="polite" className="mt-4 text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
        {retryError ? <p role="alert" className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{retryError}</p> : null}
        {actions ? <div className="mt-6 flex flex-col gap-3">{actions}</div> : null}
        {ref ? <p className="mt-6 break-all text-[11px] text-muted-foreground">Payment reference: {ref}</p> : null}
        <p className="mt-2 text-[11px] text-muted-foreground">Payments are processed securely by Squad (GTCO).</p>
      </section>
    </main>
  )
}

export default function SquadReturnPage() {
  return (
    <Suspense fallback={null}>
      <PaymentResult />
    </Suspense>
  )
}
