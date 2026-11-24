"use client"

import { useEffect } from "react"

/** Registers the DOORS service worker (production only, so local development isn't affected). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.error("[pwa] service worker registration failed", error)
      })
    }
    // Register after the page has loaded so it never slows down the first paint.
    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })
  }, [])
  return null
}
