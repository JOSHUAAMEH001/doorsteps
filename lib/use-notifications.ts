"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { getUnreadNotificationCount } from "@/app/actions/notifications"
import { landingScreen, useApp, type Screen } from "@/lib/store"

export const NOTIFICATIONS_KEY = "my-notifications"
export const UNREAD_KEY = "notifications-unread"

/** Unread notification count for the badge on "Alerts" (0 when signed out). */
export function useUnreadNotifications() {
  const { isSignedIn } = useApp()
  const { data } = useSWR(isSignedIn ? UNREAD_KEY : null, () => getUnreadNotificationCount(), {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })
  return data ?? 0
}

/**
 * Where a notification link ("/?open=orders") should take this person in the app.
 * Customers go to their orders; restaurants, riders and admins to their own dashboard.
 */
export function screenForLink(link: string | null | undefined, role: Parameters<typeof landingScreen>[0]): Screen {
  let open: string | null = null
  try {
    open = new URL(link || "/", "https://doors.local").searchParams.get("open")
  } catch {
    open = null
  }
  if (role === "vendor" || role === "rider" || role === "admin") return landingScreen(role, false)
  return open === "orders" ? "orders" : "home"
}

/**
 * Opens the right screen when someone taps a phone notification: either the app was opened
 * at "/?open=…" by the service worker, or it was already open and the service worker sent
 * a "doors-open" message. Waits for start-up (splash) and the sign-in check to finish.
 */
export function useNotificationLinks() {
  const { authChecked, isSignedIn, role, screen, navigate } = useApp()
  const [pending, setPending] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    const open = new URL(window.location.href).searchParams.get("open")
    return open ? `/?open=${encodeURIComponent(open)}` : null
  })

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; link?: unknown } | null
      if (data?.type === "doors-open") setPending(typeof data.link === "string" ? data.link : "/")
    }
    navigator.serviceWorker.addEventListener("message", onMessage)
    return () => navigator.serviceWorker.removeEventListener("message", onMessage)
  }, [])

  useEffect(() => {
    if (!pending || !authChecked) return
    if (screen === "splash" || screen === "onboarding") return
    setPending(null)
    if (isSignedIn) navigate(screenForLink(pending, role))
  }, [pending, authChecked, screen, isSignedIn, role, navigate])
}
