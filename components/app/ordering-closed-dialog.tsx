"use client"

import { useEffect, useRef } from "react"
import { Clock } from "lucide-react"
import { useApp } from "@/lib/store"

/**
 * Shown when someone taps "Add to cart" (or checkout) while DOORS isn't taking orders yet
 * (site_settings.orders_open is off). Wording approved by the DOORS owner.
 */
export function OrderingClosedDialog() {
  const { orderingNotice, closeOrderingNotice } = useApp()
  const okRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!orderingNotice) return
    okRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeOrderingNotice()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [orderingNotice, closeOrderingNotice])

  if (!orderingNotice) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="Close" onClick={closeOrderingNotice} className="absolute inset-0 bg-black/45" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ordering-closed-title"
        aria-describedby="ordering-closed-desc"
        className="relative w-full max-w-sm rounded-3xl bg-background p-5 shadow-2xl"
      >
        <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Clock aria-hidden="true" className="size-5" />
        </span>
        <h2 id="ordering-closed-title" className="mt-3 text-base font-extrabold text-foreground">
          Ordering has not started yet
        </h2>
        <p id="ordering-closed-desc" className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Doorsteps Campus Logistics Ltd has not yet started operations. Join the waitlist and we&apos;ll let you know as soon as you can order.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <a
            href="/join#waitlist"
            className="flex min-h-12 items-center justify-center rounded-2xl border border-border bg-background text-sm font-bold text-foreground active:scale-[0.98]"
          >
            Join the waitlist
          </a>
          <button
            ref={okRef}
            type="button"
            onClick={closeOrderingNotice}
            className="min-h-12 rounded-2xl bg-brand text-sm font-bold text-brand-foreground active:scale-[0.98]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
