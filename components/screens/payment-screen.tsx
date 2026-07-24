"use client"

import { Banknote, Building2, Check, CreditCard } from "lucide-react"
import { ScreenHeader, PrimaryButton } from "@/components/app/ui"
import { formatNaira } from "@/lib/data"
import { useApp, type PaymentMethod } from "@/lib/store"
import { cn } from "@/lib/utils"

const methods: {
  id: PaymentMethod
  label: string
  desc: string
  icon: typeof Banknote
}[] = [
  { id: "cod", label: "Cash on Delivery", desc: "Pay the rider when it arrives", icon: Banknote },
  { id: "transfer", label: "Bank Transfer", desc: "Transfer to our account", icon: Building2 },
  { id: "card", label: "Debit Card", desc: "Pay securely with your card", icon: CreditCard },
]

export function PaymentScreen() {
  const {
    paymentMethod,
    setPaymentMethod,
    cartSubtotal,
    deliveryFee,
    serviceFee,
    navigate,
    clearCart,
  } = useApp()

  const total = cartSubtotal + deliveryFee + serviceFee

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Payment" subtitle="Step 2 of 2" />

      <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-5 py-4">
        <section>
          <h2 className="mb-3 text-sm font-bold text-foreground">Payment method</h2>
          <div className="space-y-3">
            {methods.map((m) => {
              const Icon = m.icon
              const active = paymentMethod === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                    active ? "border-brand bg-brand-soft" : "border-border bg-card",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      active ? "bg-brand text-brand-foreground" : "bg-secondary text-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border",
                      active ? "border-brand bg-brand text-brand-foreground" : "border-border",
                    )}
                  >
                    {active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {paymentMethod === "transfer" ? (
          <div className="animate-fade-in-up rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Transfer to</p>
            <p className="mt-1 text-sm font-bold text-foreground">
              Doorsteps Logistics Ltd
            </p>
            <p className="text-sm font-semibold text-foreground">
              Moniepoint • 8123 4567 89
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Your order is confirmed once payment reflects.
            </p>
          </div>
        ) : null}

        {paymentMethod === "card" ? (
          <div className="animate-fade-in-up space-y-3">
            <input
              placeholder="Card number"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand"
            />
            <div className="flex gap-3">
              <input
                placeholder="MM / YY"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand"
              />
              <input
                placeholder="CVV"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand"
              />
            </div>
          </div>
        ) : null}

        {/* Order summary */}
        <section className="space-y-2.5 rounded-3xl bg-secondary p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold text-foreground">{formatNaira(cartSubtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Delivery fee</span>
            <span className="font-semibold text-foreground">{formatNaira(deliveryFee)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Service fee</span>
            <span className="font-semibold text-foreground">{formatNaira(serviceFee)}</span>
          </div>
          <div className="my-1 h-px bg-border" />
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground">Total</span>
            <span className="text-lg font-extrabold text-foreground">{formatNaira(total)}</span>
          </div>
        </section>
      </div>

      <div className="border-t border-border bg-background px-5 py-4">
        <PrimaryButton
          onClick={() => {
            clearCart()
            navigate("success")
          }}
        >
          {paymentMethod === "cod"
            ? `Place order • ${formatNaira(total)}`
            : `Pay ${formatNaira(total)}`}
        </PrimaryButton>
      </div>
    </div>
  )
}
