"use client"

import { useEffect, useRef } from "react"
import { ShoppingCart } from "lucide-react"
import { useApp } from "@/lib/store"

/** Asks before replacing a cart that holds items from another vendor (one order = one vendor). */
export function CartConflictDialog() {
  const { pendingCartReplace, confirmCartReplace, cancelCartReplace, cartVendorId, vendors } = useApp()
  const yesRef = useRef<HTMLButtonElement>(null)
  const open = Boolean(pendingCartReplace)

  useEffect(() => {
    if (!open) return
    yesRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") cancelCartReplace()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, cancelCartReplace])

  if (!pendingCartReplace) return null
  const currentVendor = vendors.find((v) => v.id === cartVendorId)?.name
  const newVendor = vendors.find((v) => v.id === pendingCartReplace.product.vendorId)?.name

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="Keep my current cart" onClick={cancelCartReplace} className="absolute inset-0 bg-black/45" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cart-conflict-title"
        aria-describedby="cart-conflict-desc"
        className="relative w-full max-w-sm rounded-3xl bg-background p-5 shadow-2xl"
      >
        <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <ShoppingCart aria-hidden="true" className="size-5" />
        </span>
        <h2 id="cart-conflict-title" className="mt-3 text-base font-extrabold text-foreground">
          Your cart has items from another restaurant. Start a new cart?
        </h2>
        <p id="cart-conflict-desc" className="mt-1.5 text-sm text-muted-foreground">
          {currentVendor && newVendor
            ? `Starting a new cart removes your items from ${currentVendor} and adds ${pendingCartReplace.product.name} from ${newVendor}.`
            : `Starting a new cart removes your current items and adds ${pendingCartReplace.product.name}.`}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={cancelCartReplace}
            className="min-h-12 rounded-2xl border border-border bg-background text-sm font-bold text-foreground active:scale-[0.98]"
          >
            No, keep cart
          </button>
          <button
            ref={yesRef}
            type="button"
            onClick={confirmCartReplace}
            className="min-h-12 rounded-2xl bg-brand text-sm font-bold text-brand-foreground active:scale-[0.98]"
          >
            Yes, new cart
          </button>
        </div>
      </div>
    </div>
  )
}
