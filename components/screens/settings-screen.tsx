"use client"

import { useState } from "react"
import { ChevronRight, Globe, Moon, Bell, ShieldCheck, FileText, Trash2, Fingerprint } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { ScreenHeader } from "@/components/app/ui"
import { cn } from "@/lib/utils"

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-brand" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform",
          on ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  )
}

export function SettingsScreen() {
  const [push, setPush] = useState(true)
  const [promos, setPromos] = useState(true)
  const [dark, setDark] = useState(false)
  const [biometric, setBiometric] = useState(false)

  const toggles: { icon: LucideIcon; label: string; desc: string; on: boolean; set: () => void }[] = [
    {
      icon: Bell,
      label: "Push notifications",
      desc: "Order updates & rider alerts",
      on: push,
      set: () => setPush((v) => !v),
    },
    {
      icon: Bell,
      label: "Promotions & offers",
      desc: "Deals from vendors near you",
      on: promos,
      set: () => setPromos((v) => !v),
    },
    {
      icon: Fingerprint,
      label: "Biometric login",
      desc: "Use fingerprint to sign in",
      on: biometric,
      set: () => setBiometric((v) => !v),
    },
    {
      icon: Moon,
      label: "Dark mode",
      desc: "Easier on the eyes at night",
      on: dark,
      set: () => setDark((v) => !v),
    },
  ]

  const links: { icon: LucideIcon; label: string; value?: string }[] = [
    { icon: Globe, label: "Language", value: "English" },
    { icon: ShieldCheck, label: "Privacy & security" },
    { icon: FileText, label: "Terms & conditions" },
  ]

  return (
    <div className="flex min-h-full flex-col bg-background pb-24">
      <ScreenHeader title="Settings" />

      <div className="px-5">
        <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Preferences
        </h2>
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          {toggles.map((t, i) => {
            const Icon = t.icon
            return (
              <div
                key={t.label}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderTop: i === 0 ? undefined : "1px solid var(--border)" }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
                <Toggle on={t.on} onToggle={t.set} />
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-5 px-5">
        <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          General
        </h2>
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          {links.map((l, i) => {
            const Icon = l.icon
            return (
              <button
                type="button"
                key={l.label}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary"
                style={{ borderTop: i === 0 ? undefined : "1px solid var(--border)" }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="flex-1 text-sm font-semibold text-foreground">{l.label}</span>
                {l.value && (
                  <span className="text-xs font-medium text-muted-foreground">{l.value}</span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5 px-5">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3.5 text-sm font-bold text-brand transition-colors active:bg-secondary"
        >
          <Trash2 className="h-4 w-4" />
          Delete account
        </button>
      </div>
    </div>
  )
}
