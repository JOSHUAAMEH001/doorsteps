"use client"

import {
  ChevronRight,
  MapPin,
  CreditCard,
  Headphones,
  Info,
  Settings,
  Bell,
  Package,
  LogOut,
  Pencil,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useApp } from "@/lib/store"
import type { Screen } from "@/lib/store"
import { ScreenHeader } from "@/components/app/ui"

interface Row {
  icon: LucideIcon
  label: string
  value?: string
  to?: Screen
}

export function ProfileScreen() {
  const { navigate, userName, isGuest } = useApp()

  const account: Row[] = [
    { icon: MapPin, label: "Saved addresses", value: "3 saved" },
    { icon: CreditCard, label: "Payment methods", value: "2 cards" },
    { icon: Package, label: "My orders", to: "orders" },
    { icon: Bell, label: "Notifications", to: "notifications" },
  ]

  const more: Row[] = [
    { icon: Headphones, label: "Help & support", to: "support" },
    { icon: Settings, label: "Settings", to: "settings" },
    { icon: Info, label: "About Doorsteps" },
  ]

  return (
    <div className="flex min-h-full flex-col bg-background pb-24">
      <ScreenHeader title="Profile" />

      {/* Identity card */}
      <div className="px-5">
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl font-extrabold text-brand-foreground">
            {userName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold text-foreground">
              {isGuest ? "Guest User" : userName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {isGuest ? "Sign in to save your details" : "+234 803 555 0192"}
            </p>
            <p className="truncate text-xs text-muted-foreground">ESUT Agbani, Enugu</p>
          </div>
          <button
            type="button"
            aria-label="Edit profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-transform active:scale-90"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3 px-5">
        {[
          { label: "Orders", value: "24" },
          { label: "Saved ₦", value: "8.2k" },
          { label: "Rating", value: "4.9" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm"
          >
            <p className="text-lg font-extrabold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <Section title="Account" rows={account} onGo={navigate} />
      <Section title="More" rows={more} onGo={navigate} />

      <div className="px-5 pt-4">
        <button
          type="button"
          onClick={() => navigate("auth")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3.5 text-sm font-bold text-brand transition-colors active:bg-secondary"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Doorsteps Logistics • Version 1.0.0
        </p>
      </div>
    </div>
  )
}

function Section({
  title,
  rows,
  onGo,
}: {
  title: string
  rows: Row[]
  onGo: (s: Screen) => void
}) {
  return (
    <div className="mt-5 px-5">
      <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        {rows.map((r, i) => {
          const Icon = r.icon
          return (
            <button
              type="button"
              key={r.label}
              onClick={() => r.to && onGo(r.to)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary"
              style={{ borderTop: i === 0 ? undefined : "1px solid var(--border)" }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="flex-1 text-sm font-semibold text-foreground">{r.label}</span>
              {r.value && (
                <span className="text-xs font-medium text-muted-foreground">{r.value}</span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
