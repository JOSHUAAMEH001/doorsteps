"use client"

import Image from "next/image"
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react"
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
  } = useApp()

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

        {/* Promo code */}
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-border bg-card p-3">
          <input
            placeholder="Enter promo code (AGBANI10)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button type="button" className="text-xs font-bold text-brand">
            Apply
          </button>
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
          onClick={() => navigate("delivery")}
          className="flex w-full items-center justify-between rounded-2xl bg-brand px-5 py-4 text-sm font-bold text-brand-foreground transition-transform active:scale-[0.98]"
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
