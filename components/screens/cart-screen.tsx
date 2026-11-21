"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { Minus, Plus, ShoppingCart, Store, Trash2 } from "lucide-react"
import { ScreenHeader, PrimaryButton } from "@/components/app/ui"
import { formatNaira } from "@/lib/data"
import { useApp } from "@/lib/store"

export function CartScreen() {
  const {
    cart,
    updateQty,
    removeFromCart,
    cartSubtotal,
    deliveryFee,
    serviceFee,
    navigate,
    isSignedIn,
    clearCart,
    cartVendorId,
    vendors,
  } = useApp()
  const [confirmClear, setConfirmClear] = useState(false)

  // "Clear cart" needs a second tap within a few seconds, so a stray tap can't empty it.
  useEffect(() => {
    if (!confirmClear) return
    const timer = window.setTimeout(() => setConfirmClear(false), 4000)
    return () => window.clearTimeout(timer)
  }, [confirmClear])

  const vendor = vendors.find((v) => v.id === cartVendorId)
  const mixedVendors = cart.some((line) => line.product.vendorId !== cartVendorId)

  const total = cartSubtotal + deliveryFee + serviceFee

  if (cart.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <ScreenHeader title="Your cart" />
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </span>
          <h2 className="mt-5 text-lg font-extrabold text-foreground">
            Your cart is empty
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse vendors and add items to get started.
          </p>
          <div className="mt-6 w-full max-w-xs">
            <PrimaryButton onClick={() => navigate("home")}>
              Start ordering
            </PrimaryButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Your cart" subtitle={`${cart.length} item(s)`} />

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => vendor && navigate("vendor", { vendorId: vendor.id })}
            disabled={!vendor}
            className="flex min-w-0 items-center gap-2 text-left disabled:cursor-default"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Store aria-hidden="true" className="size-4" /></span>
            <span className="min-w-0">
              <span className="block text-[11px] font-medium text-muted-foreground">Ordering from</span>
              <span className="block truncate text-sm font-extrabold text-foreground">{vendor?.name ?? "Restaurant"}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirmClear) { clearCart(); setConfirmClear(false) }
              else setConfirmClear(true)
            }}
            className={confirmClear
              ? "min-h-10 shrink-0 rounded-full bg-destructive px-4 text-xs font-bold text-white"
              : "min-h-10 shrink-0 rounded-full border border-border px-4 text-xs font-bold text-destructive"}
          >
            {confirmClear ? "Tap again to clear" : "Clear cart"}
          </button>
        </div>
        {mixedVendors ? (
          <p role="alert" className="mb-3 rounded-2xl bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
            Your cart has items from more than one restaurant. Each order can only come from one restaurant, so remove the extra items or clear the cart.
          </p>
        ) : null}
        <div className="space-y-3">
          {cart.map((line) => (
            <div
              key={line.product.id}
              className="flex gap-3 rounded-3xl border border-border bg-card p-3"
            >
              <div className="relative h-20 w-20 shrink-0">
                <Image
                  src={line.product.image || "/placeholder.svg"}
                  alt={line.product.name}
                  fill
                  className="rounded-2xl object-cover"
                  sizes="80px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    {line.product.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeFromCart(line.product.id)}
                    className="text-muted-foreground active:scale-90"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {line.note ? (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    Note: {line.note}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">
                    {formatNaira(line.product.price * line.qty)}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateQty(line.product.id, line.qty - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary active:scale-90"
                      aria-label="Decrease"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-bold text-foreground">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(line.product.id, line.qty + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-brand-foreground active:scale-90"
                      aria-label="Increase"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-4 space-y-2.5 rounded-3xl bg-secondary p-4">
          <Row label="Subtotal" value={formatNaira(cartSubtotal)} />
          <Row label="Delivery fee" value={formatNaira(deliveryFee)} />
          <Row label="Service fee" value={formatNaira(serviceFee)} />
          <div className="my-1 h-px bg-border" />
          <Row label="Total" value={formatNaira(total)} bold />
        </div>
      </div>

      <div className="border-t border-border bg-background px-5 py-4">
        <button
          type="button"
          // Checkout needs an account; anyone not signed in logs in first and comes back here.
          onClick={() => navigate(isSignedIn ? "delivery" : "auth")}
          disabled={mixedVendors}
          className="flex w-full disabled:opacity-50 items-center justify-between rounded-2xl bg-brand px-5 py-4 text-sm font-bold text-brand-foreground transition-transform active:scale-[0.98]"
        >
          <span>Proceed to checkout</span>
          <span>{formatNaira(total)}</span>
        </button>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={bold ? "font-bold text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={bold ? "text-base font-extrabold text-foreground" : "font-semibold text-foreground"}>
        {value}
      </span>
    </div>
  )
}
