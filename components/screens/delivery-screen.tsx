"use client"

import { Check, Clock, Home, MapPin, Phone } from "lucide-react"
import { useState } from "react"
import { ScreenHeader, PrimaryButton } from "@/components/app/ui"
import { useApp } from "@/lib/store"
import { cn } from "@/lib/utils"

const savedAddresses = [
  {
    id: "hostel",
    label: "Hostel B",
    address: "Room 12, ESUT Hostel B, Agbani",
    icon: Home,
  },
  {
    id: "faculty",
    label: "Faculty of Engineering",
    address: "Engineering complex, ESUT Agbani",
    icon: MapPin,
  },
]

const timeOptions = ["As soon as possible", "In 30 minutes", "In 1 hour", "Schedule"]

export function DeliveryScreen() {
  const { navigate } = useApp()
  const [addressId, setAddressId] = useState("hostel")
  const [phone, setPhone] = useState("0801 234 5678")
  const [instructions, setInstructions] = useState("")
  const [time, setTime] = useState(timeOptions[0])

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Delivery details" subtitle="Step 1 of 2" />

      <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-5 py-4">
        {/* Address */}
        <section>
          <h2 className="mb-3 text-sm font-bold text-foreground">Delivery address</h2>
          <div className="space-y-3">
            {savedAddresses.map((a) => {
              const Icon = a.icon
              const active = addressId === a.id
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAddressId(a.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors",
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
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">{a.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.address}</p>
                  </div>
                  {active ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-brand-foreground">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              )
            })}
            <button
              type="button"
              className="w-full rounded-2xl border border-dashed border-border py-3 text-sm font-semibold text-brand"
            >
              + Add new address
            </button>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-foreground">Contact number</h2>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 focus-within:border-brand">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
            placeholder="e.g. Call when you reach the gate, ask for Chidera"
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
        <PrimaryButton onClick={() => navigate("payment")}>
          Continue to payment
        </PrimaryButton>
      </div>
    </div>
  )
}
