"use client"

import { Clock, MapPin, Phone } from "lucide-react"
import { useEffect, useState } from "react"
import { ScreenHeader, PrimaryButton } from "@/components/app/ui"
import { useApp } from "@/lib/store"
import { cn } from "@/lib/utils"

const timeOptions = ["As soon as possible", "In 30 minutes", "In 1 hour", "Schedule"]
const NG_PHONE = /^(0|\+?234)?[789][01]\d{8}$/

export function DeliveryScreen() {
  const { navigate, setDeliveryDetails } = useApp()
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [instructions, setInstructions] = useState("")
  const [time, setTime] = useState(timeOptions[0])
  const [error, setError] = useState("")

  // Prefill the customer's OWN last address and phone on this device (no sample data).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("doors-delivery") ?? "null") as { address?: string; phone?: string } | null
      if (saved?.address) setAddress(saved.address)
      if (saved?.phone) setPhone(saved.phone)
    } catch { /* storage unavailable */ }
  }, [])

  function continueToPayment() {
    const cleanAddress = address.trim()
    if (cleanAddress.length < 4) {
      setError("Enter your delivery address, e.g. your hostel, block and room number.")
      return
    }
    if (!NG_PHONE.test(phone.replace(/[\s-]/g, ""))) {
      setError("Enter a valid Nigerian phone number, e.g. 0803 000 0000.")
      return
    }
    setError("")
    try { localStorage.setItem("doors-delivery", JSON.stringify({ address: cleanAddress, phone: phone.trim() })) } catch { /* storage unavailable */ }
    setDeliveryDetails({ address: cleanAddress, phone, instructions, time })
    navigate("payment")
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Delivery details" subtitle="Step 1 of 2" />

      <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-5 py-4">
        {/* Address */}
        <section>
          <h2 className="mb-3 text-sm font-bold text-foreground">Delivery address</h2>
          <div className="flex items-start gap-2 rounded-2xl border border-border bg-background px-4 py-3 focus-within:border-brand">
            <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              maxLength={200}
              aria-label="Delivery address"
              autoComplete="street-address"
              placeholder="Where should we deliver? e.g. your hostel, block and room number"
              className="flex-1 resize-none bg-transparent text-sm outline-none"
            />
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-foreground">Contact number</h2>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 focus-within:border-brand">
            <Phone aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              aria-label="Contact number"
              placeholder="0803 000 0000"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </section>

        {/* Instructions */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-foreground">
            Delivery instructions
          </h2>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            placeholder="e.g. Call when you reach the gate"
            className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </section>

        {/* Time */}
        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Clock className="h-4 w-4" /> Delivery time
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {timeOptions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-sm font-semibold transition-colors",
                  time === t
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border bg-card text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="border-t border-border bg-background px-5 py-4">
        {error ? <p role="alert" className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p> : null}
        <PrimaryButton onClick={continueToPayment}>
          Continue to payment
        </PrimaryButton>
      </div>
    </div>
  )
}
