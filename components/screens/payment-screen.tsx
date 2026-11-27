"use client"

import { Banknote, Building2, Check, CreditCard, LoaderCircle } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { submitCheckout } from "@/app/actions/order"
import { getOnlinePaymentStatus, startOnlinePayment } from "@/app/actions/payments"
import { ScreenHeader, PrimaryButton } from "@/components/app/ui"
import { formatNaira } from "@/lib/data"
import { useApp, type PaymentMethod } from "@/lib/store"
import { cn } from "@/lib/utils"
import { TRANSFER_ACCOUNT } from "@/lib/payment-details"
import { TransferDetails } from "@/components/app/transfer-details"

type MethodOption = { id: PaymentMethod; label: string; desc: string; icon: typeof Banknote }

/**
 * "Pay online" (stored as payment_method "card") opens Squad by GTCO's hosted payment page:
 * card, bank transfer or USSD. DOORS never collects card numbers or CVVs on its own form.
 * It only appears when the server has a Squad key and can record verified payments.
 */
function paymentMethods(onlineEnabled: boolean): MethodOption[] {
  return [
    ...(onlineEnabled ? [{ id: "card" as const, label: "Pay online", desc: "Card, bank transfer or USSD · secured by Squad (GTCO)", icon: CreditCard }] : []),
    { id: "cod", label: "Cash on Delivery", desc: "Pay the rider when it arrives", icon: Banknote },
    ...(TRANSFER_ACCOUNT ? [{ id: "transfer" as const, label: "Bank Transfer", desc: "Transfer to our account", icon: Building2 }] : []),
  ]
}

function newRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16))
}

export function PaymentScreen() {
  const {
    paymentMethod,
    setPaymentMethod,
    cartSubtotal,
    deliveryFee,
    serviceFee,
    navigate,
    clearCart,
    placeOrder,
    deliveryDetails,
    cart,
    userName,
    vendors,
  } = useApp()
  const { data: online, isLoading: onlineLoading } = useSWR("online-payment-status", () => getOnlinePaymentStatus(), { revalidateOnFocus: false })
  const methods = useMemo(() => paymentMethods(Boolean(online?.enabled)), [online?.enabled])
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  // One id per checkout attempt: retries and double taps return the same order, never a second one.
  const requestId = useRef(newRequestId())

  // If a hidden method was selected earlier, fall back to cash on delivery
  // (only once we know whether online payment is available).
  useEffect(() => {
    if (onlineLoading) return
    if (!methods.some((m) => m.id === paymentMethod)) setPaymentMethod("cod")
  }, [methods, onlineLoading, paymentMethod, setPaymentMethod])

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

        {paymentMethod === "transfer" && TRANSFER_ACCOUNT ? <TransferDetails /> : null}
        {paymentMethod === "card" ? (
          <p className="rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            You&apos;ll be taken to Squad&apos;s secure payment page to pay by card, bank transfer or USSD, then brought back here.
            {online?.sandbox ? <span className="mt-1 block font-semibold text-warning-strong">Test mode: no real money is charged.</span> : null}
          </p>
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
        {error ? <p role="alert" aria-live="assertive" className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p> : null}
        <PrimaryButton
          disabled={submitting}
          onClick={async () => {
            if (submitting) return
            if (!deliveryDetails) {
              setError("Please add your delivery details before paying.")
              return
            }
            if (cartSubtotal <= 0 || !cart.length) {
              setError("Your cart is empty. Add an item before placing an order.")
              return
            }
            const vendorId = cart[0].product.vendorId
            const vendor = vendors.find((item) => item.id === vendorId)
            if (!vendor) {
              setError("This vendor is no longer available.")
              return
            }
            if (cart.some((line) => line.product.vendorId !== vendorId)) {
              setError("Your cart has items from more than one restaurant. Go back to your cart and keep items from one restaurant only.")
              return
            }
            setError("")
            setSubmitting(true)
            let result: Awaited<ReturnType<typeof submitCheckout>>
            try {
              result = await submitCheckout({
                requestId: requestId.current,
                customerName: userName,
                phone: deliveryDetails.phone,
                pickupLocation: vendor.name,
                dropoffLocation: deliveryDetails.address,
                dropoffLat: deliveryDetails.dropoffLat,
                dropoffLng: deliveryDetails.dropoffLng,
                // Room/hostel/landmark first, then any extra instructions, for the rider.
                dropoffNote: [deliveryDetails.landmark, deliveryDetails.instructions.trim()].filter(Boolean).join(" · "),
                itemDescription: cart.map((line) => `${line.qty}x ${line.product.name}`).join(", "),
                vendorId,
                subtotal: cartSubtotal,
                deliveryFee,
                total,
                paymentMethod: paymentMethod === "cod" ? "cash" : paymentMethod,
                items: cart.map((line) => ({
                  menuItemId: line.product.id,
                  itemName: line.product.name,
                  unitPrice: line.product.price,
                  quantity: line.qty,
                })),
              })
            } catch {
              setSubmitting(false)
              setError("We couldn't place your order. Check your internet connection and try again. Your cart has been kept.")
              return
            }
            if (!result.ok) {
              setSubmitting(false)
              setError(result.message || "We couldn't place your order. Please try again. Your cart has been kept.")
              return
            }
            if (paymentMethod === "card") {
              // The order is saved unpaid; the restaurant only sees it once Squad confirms payment.
              let started: Awaited<ReturnType<typeof startOnlinePayment>>
              try {
                started = await startOnlinePayment(result.orderCode)
              } catch {
                started = { ok: false, message: "We couldn't reach the payment service. Check your connection and try again." }
              }
              if (!started.ok) {
                // Keep the same request id: trying again reuses this order instead of creating another.
                setSubmitting(false)
                setError(`${started.message} Your order ${result.orderCode} is saved and unpaid.`)
                return
              }
              requestId.current = newRequestId()
              placeOrder(result.orderCode)
              clearCart()
              window.location.assign(started.checkoutUrl)
              return
            }
            requestId.current = newRequestId()
            placeOrder(result.orderCode)
            clearCart()
            // Replace the payment step, so Back from the confirmation can't resubmit the order.
            navigate("success", { orderCode: result.orderCode, vendorId }, { replace: true })
          }}
        >
          {submitting
            ? <><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />{paymentMethod === "card" ? "Opening secure payment…" : "Placing your order…"}</>
            : paymentMethod === "card"
              ? `Pay ${formatNaira(total)} online`
              : paymentMethod === "cod"
              ? `Place order • ${formatNaira(total)}`
              : `Pay ${formatNaira(total)}`}
        </PrimaryButton>
      </div>
    </div>
  )
}
