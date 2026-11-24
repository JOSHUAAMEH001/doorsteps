"use client"

import { useCallback, useEffect, useState } from "react"
import { BellOff, BellRing, LoaderCircle } from "lucide-react"
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push-client"
import { cn } from "@/lib/utils"

/**
 * Turn phone notifications on/off for this device. `why` says what the person will be told
 * about (e.g. "when a restaurant accepts your order"). Only render it for signed-in people.
 */
export function PushToggle({ why, compact = false, hideWhenOn = false }: { why: string; compact?: boolean; hideWhenOn?: boolean }) {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const refresh = useCallback(() => {
    getPushState().then(setState).catch(() => setState("unsupported"))
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [refresh])

  async function turnOn() {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      const result = await enablePush()
      if (!result.ok) setError(result.error)
    } finally {
      setBusy(false)
      refresh()
    }
  }

  async function turnOff() {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      await disablePush()
    } finally {
      setBusy(false)
      refresh()
    }
  }

  if (state === null || (hideWhenOn && state === "on" && !busy)) return null

  const message =
    state === "on" ? "Notifications are on for this phone."
    : state === "denied" ? "Notifications are blocked for DOORS. Allow them in your browser's site settings, then come back."
    : state === "needs-install" ? "On iPhone: tap Share, then “Add to Home Screen”. Open DOORS from your Home Screen to turn on notifications."
    : state === "unsupported" ? "This browser can't show notifications. Try Chrome on Android, or add DOORS to your iPhone Home Screen."
    : `Get a notification ${why}.`

  return (
    <div className={cn("rounded-2xl border border-border bg-card", compact ? "p-3" : "p-4")}>
      <div className="flex items-start gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", state === "on" ? "bg-[#E8F7EE] text-[#167A43]" : "bg-brand-soft text-brand")}>
          {state === "on" ? <BellRing aria-hidden="true" className="size-4.5" /> : <BellOff aria-hidden="true" className="size-4.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Phone notifications</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{message}</p>
        </div>
      </div>
      {state === "off" || state === "on" ? (
        <button
          type="button"
          onClick={state === "on" ? turnOff : turnOn}
          disabled={busy}
          className={cn(
            "mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold active:scale-[0.98] disabled:opacity-60",
            state === "on" ? "border border-border bg-background text-foreground" : "bg-brand text-brand-foreground",
          )}
        >
          {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
          {state === "on" ? "Turn off on this phone" : "Turn on notifications"}
        </button>
      ) : null}
      {error ? <p role="alert" className="mt-2 text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  )
}
