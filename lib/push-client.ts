"use client"

import { getPushPublicKey, removePushSubscription, savePushSubscription } from "@/app/actions/notifications"

/**
 * on            this device gets notifications
 * off           can be turned on
 * denied        the person blocked notifications for this site in the browser
 * needs-install iPhone/iPad: only works after "Add to Home Screen" (iOS 16.4+)
 * unsupported   this browser can't do web push
 */
export type PushState = "on" | "off" | "denied" | "needs-install" | "unsupported"

function isIos() {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function supported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

function base64UrlToBytes(value: string) {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(padded)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array) {
  if (!a) return false
  const x = new Uint8Array(a)
  return x.length === b.length && x.every((v, i) => v === b[i])
}

async function registration(timeoutMs = 8000): Promise<ServiceWorkerRegistration | null> {
  if (!supported()) return null
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing) return existing
  // Not registered yet (first visit, or dev mode): register now and wait until ready.
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" })
  } catch {
    return null
  }
  return await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ])
}

export async function getPushState(): Promise<PushState> {
  if (!supported()) return isIos() && !isStandalone() ? "needs-install" : "unsupported"
  if (Notification.permission === "denied") return "denied"
  if (Notification.permission !== "granted") return "off"
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    return sub ? "on" : "off"
  } catch {
    return "off"
  }
}

/** Asks for permission (must be called from a tap) and registers this device. */
export async function enablePush(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supported()) {
    return { ok: false, error: isIos() ? "On iPhone, add DOORS to your Home Screen first, then open it from there." : "This browser can't show notifications." }
  }
  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    return { ok: false, error: permission === "denied" ? "Notifications are blocked. Allow them for this site in your browser settings." : "Notifications weren't allowed." }
  }
  const key = await getPushPublicKey()
  if (!key) return { ok: false, error: "Notifications aren't switched on yet. Please try again later." }
  const reg = await registration()
  if (!reg) return { ok: false, error: "We couldn't set up notifications on this device. Reload the page and try again." }

  try {
    const appKey = base64UrlToBytes(key)
    let sub = await reg.pushManager.getSubscription()
    // A subscription made with an older key can't receive our messages: replace it.
    if (sub && !sameKey(sub.options.applicationServerKey, appKey)) {
      await sub.unsubscribe().catch(() => {})
      sub = null
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey })
    const data = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    const saved = await savePushSubscription(
      { endpoint: data.endpoint ?? sub.endpoint, keys: { p256dh: data.keys?.p256dh ?? "", auth: data.keys?.auth ?? "" } },
      navigator.userAgent,
    )
    if (!saved.ok) return saved
    return { ok: true }
  } catch (error) {
    console.error("[push] subscribe failed", error)
    return { ok: false, error: "We couldn't turn on notifications on this device. Please try again." }
  }
}

/** Stops notifications on this device for the signed-in person. */
export async function disablePush(): Promise<void> {
  if (!supported()) return
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    await removePushSubscription(sub.endpoint)
    await sub.unsubscribe()
  } catch (error) {
    console.error("[push] unsubscribe failed", error)
  }
}

/**
 * Before signing out: stop this device receiving the signed-out person's notifications
 * (shared phones). Best effort and time-limited, so it can never hold up signing out.
 */
export async function forgetPushOnThisDevice(timeoutMs = 1500): Promise<void> {
  await Promise.race([disablePush(), new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))])
}
