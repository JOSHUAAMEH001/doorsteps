"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { TRANSFER_ACCOUNT } from "@/lib/payment-details"

/** The DOORS bank account with a one-tap "copy account number" button. */
export function TransferDetails({ orderCode }: { orderCode?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(TRANSFER_ACCOUNT.accountNumber)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: the number is still visible to copy by hand.
    }
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-left">
      <p className="text-xs text-muted-foreground">Transfer to</p>
      <p className="mt-1 text-sm font-bold text-foreground">{TRANSFER_ACCOUNT.accountName}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">
          {TRANSFER_ACCOUNT.bank} • <span className="tabular-nums tracking-wide">{TRANSFER_ACCOUNT.accountNumber}</span>
        </p>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-secondary px-3 text-xs font-bold text-foreground active:scale-95"
        >
          {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
          {copied ? "Copied" : "Copy number"}
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {orderCode
          ? <>Transfer the order total and write <strong className="text-foreground">{orderCode}</strong> as the transfer description. DOORS will confirm your payment.</>
          : <>Place your order first. You&apos;ll get an order number to use as the transfer description. DOORS will confirm your payment.</>}
      </p>
    </div>
  )
}
