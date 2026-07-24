"use client"

import { Check } from "lucide-react"
import { PrimaryButton } from "@/components/app/ui"
import { useApp } from "@/lib/store"

export function SuccessScreen() {
  const { navigate } = useApp()

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="animate-scale-in">
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
        <span className="font-bold text-foreground">DL-4822</span> has been sent to
        the vendor. We&apos;ll notify you as it&apos;s prepared and dispatched.
      </p>

      <div className="mt-6 w-full max-w-xs rounded-3xl bg-secondary p-4 text-left">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Estimated arrival</span>
          <span className="font-bold text-foreground">20 - 30 min</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Delivery to</span>
          <span className="font-bold text-foreground">ESUT Hostel B</span>
        </div>
      </div>

      <div className="mt-8 w-full max-w-xs space-y-3">
        <PrimaryButton onClick={() => navigate("tracking", { vendorId: "mama-nkechi" })}>
          Track your order
        </PrimaryButton>
        <PrimaryButton variant="outline" onClick={() => navigate("home")}>
          Back to home
        </PrimaryButton>
      </div>
    </div>
  )
}
