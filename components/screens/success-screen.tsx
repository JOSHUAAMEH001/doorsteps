"use client"

import { Check } from "lucide-react"
import { PrimaryButton } from "@/components/app/ui"
import { useApp } from "@/lib/store"

export function SuccessScreen() {
  const { navigate, params, deliveryDetails } = useApp()

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div>
        <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-brand-foreground">
            <Check className="h-8 w-8" strokeWidth={3} />
          </span>
        </span>
      </div>

      <h1 className="mt-8 text-2xl font-extrabold tracking-tight text-foreground">
        Order placed!
      </h1>
      <p className="mt-2 max-w-[280px] text-pretty text-sm leading-relaxed text-muted-foreground">
        Your order{" "}
        <span className="font-bold text-foreground">{params.orderCode}</span> has been sent to
        the vendor. We&apos;ll notify you as it&apos;s prepared and dispatched.
      </p>

      <div className="mt-6 w-full max-w-xs space-y-2 rounded-3xl bg-secondary p-4 text-left text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Status</span>
          <span className="font-bold text-foreground">Waiting for the vendor</span>
        </div>
        {deliveryDetails?.address ? (
          <div className="flex items-start justify-between gap-3">
            <span className="shrink-0 text-muted-foreground">Delivery to</span>
            <span className="text-right font-bold text-foreground">{deliveryDetails.address}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-8 w-full max-w-xs space-y-3">
        <PrimaryButton onClick={() => navigate("tracking", { orderCode: params.orderCode, vendorId: params.vendorId })}>
          Track your order
        </PrimaryButton>
        <PrimaryButton variant="outline" onClick={() => navigate("home", {}, { replace: true })}>
          Back to home
        </PrimaryButton>
      </div>
    </div>
  )
}
