"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Share, SquarePlus, X } from "lucide-react"

/**
 * "Get DOORS on your phone" prompt.
 *  - Android/desktop Chrome & Edge: uses the browser's real install prompt (beforeinstallprompt).
 *    If the browser doesn't offer installation, nothing is shown (no fake button).
 *  - iPhone/iPad: browsers there have no install API, so we show how to "Add to Home Screen".
 *  - Appears only after real engagement (time on site + an interaction), never while `blocked`
 *    (checkout, payment, login, active order), never once installed, and respects "Not now".
 */

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

const DISMISS_KEY = "doors-install-dismissed-at"
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000
const ENGAGED_AFTER_MS = 25_000

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}
function isIos() {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}
function recentlyDismissed() {
  try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) ?? 0) < SNOOZE_MS } catch { return false }
}
function rememberDismissal() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* storage unavailable */ }
}

export function InstallPrompt({ blocked = false }: { blocked?: boolean }) {
  const deferred = useRef<InstallEvent | null>(null)
  const [mode, setMode] = useState<"native" | "ios" | null>(null)
  const [engaged, setEngaged] = useState(false)
  const [hidden, setHidden] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isInstalled() || recentlyDismissed()) return
    setHidden(false)

    const onBeforeInstall = (e: Event) => {
      e.preventDefault() // keep it for our own, better-timed prompt
      deferred.current = e as InstallEvent
      setMode("native")
    }
    const onInstalled = () => {
      deferred.current = null
      setHidden(true)
      rememberDismissal()
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    if (isIos()) setMode("ios")

    // Engagement: some time on the site AND at least one tap/click.
    let interacted = false
    let timeUp = false
    const check = () => { if (interacted && timeUp) setEngaged(true) }
    const onInteract = () => { interacted = true; check() }
    const timer = window.setTimeout(() => { timeUp = true; check() }, ENGAGED_AFTER_MS)
    window.addEventListener("pointerdown", onInteract, { passive: true })

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("pointerdown", onInteract)
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (hidden || blocked || !engaged || !mode) return null

  function dismiss() {
    rememberDismissal()
    setHidden(true)
  }

  async function install() {
    const event = deferred.current
    if (!event) return
    setBusy(true)
    try {
      await event.prompt()
      const choice = await event.userChoice
      deferred.current = null
      if (choice.outcome !== "accepted") rememberDismissal()
      setHidden(true)
    } catch {
      setHidden(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-3 lg:bottom-6">
      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby="install-title"
        className="pointer-events-auto w-full max-w-md rounded-3xl border border-black/5 bg-white p-4 text-[#171717] shadow-[0_24px_60px_-20px_rgb(0_0_0/0.45)] [animation:doors-fade-in_.3s_ease-out]"
      >
        <div className="flex items-start gap-3">
          <Image src="/pwa/icon-192.png" alt="" width={48} height={48} className="size-12 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <h2 id="install-title" className="text-base font-extrabold tracking-tight">Get DOORS on your phone</h2>
            <p className="mt-0.5 text-sm leading-snug text-[#525252]">Your food and groceries, just a tap away. Install DOORS for quicker access and a smoother ordering experience.</p>
          </div>
          <button type="button" onClick={dismiss} aria-label="Close" className="-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl text-[#737373] hover:bg-[#F3F3F3]">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        {mode === "ios" ? (
          <ol className="mt-3 space-y-1.5 rounded-2xl bg-[#F7F7F7] p-3 text-sm text-[#404040]">
            <li className="flex items-center gap-2"><span className="font-bold">1.</span> Tap <Share aria-label="Share" className="size-4 text-[#1F6FEB]" /> <strong>Share</strong> in your browser</li>
            <li className="flex items-center gap-2"><span className="font-bold">2.</span> Choose <SquarePlus aria-hidden="true" className="size-4" /> <strong>Add to Home Screen</strong></li>
          </ol>
        ) : null}

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={dismiss} className="min-h-11 flex-1 rounded-2xl bg-[#F3F3F3] text-sm font-bold text-[#171717]">Not now</button>
          {mode === "native" ? (
            <button type="button" onClick={() => void install()} disabled={busy} className="min-h-11 flex-1 rounded-2xl bg-[#D71920] text-sm font-extrabold text-white disabled:opacity-70">
              {busy ? "Opening…" : "Install DOORS"}
            </button>
          ) : (
            <button type="button" onClick={dismiss} className="min-h-11 flex-1 rounded-2xl bg-[#171717] text-sm font-extrabold text-white">Got it</button>
          )}
        </div>
      </section>
    </div>
  )
}
