"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type TrackableOrder = { id: string; status: string }
type WakeLock = { release: () => Promise<void> }
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLock> } }

interface RiderLocationSharingOptions {
  isLoading: boolean
  hasError: boolean
}

export function useRiderLocationSharing(
  orders: TrackableOrder[],
  { isLoading, hasError }: RiderLocationSharingOptions,
) {
  const supabase = useMemo(() => createClient(), [])
  const [sharingOrderId, setSharingOrderId] = useState<string | null>(null)
  const [statusOrderId, setStatusOrderId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusIsError, setStatusIsError] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const activeOrderRef = useRef<string | null>(null)
  const riderIdRef = useRef<string | null>(null)
  const sessionRef = useRef(0)
  const watchIdRef = useRef<number | null>(null)
  const wakeLockRef = useRef<WakeLock | null>(null)
  const visibilityHandlerRef = useRef<(() => void) | null>(null)
  const lastWriteAttemptRef = useRef(0)
  const pendingWriteRef = useRef<Promise<void> | null>(null)

  const clearResources = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation?.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (visibilityHandlerRef.current && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", visibilityHandlerRef.current)
      visibilityHandlerRef.current = null
    }
    const wakeLock = wakeLockRef.current
    wakeLockRef.current = null
    if (wakeLock) void wakeLock.release().catch(() => undefined)
  }, [])

  const stopSharing = useCallback(async (message: string | null = "Location sharing stopped.", isError = false) => {
    sessionRef.current += 1
    clearResources()
    const riderId = riderIdRef.current
    const orderId = activeOrderRef.current
    riderIdRef.current = null
    activeOrderRef.current = null
    setSharingOrderId(null)
    setLastUpdatedAt(null)
    setIsStarting(false)
    setStatusOrderId(message ? orderId : null)
    setStatusMessage(message)
    setStatusIsError(isError)

    const pendingWrite = pendingWriteRef.current
    if (pendingWrite) await pendingWrite
    if (riderId) {
      const { error } = await supabase.from("rider_locations").delete().eq("rider_id", riderId)
      if (error) {
        setStatusOrderId(orderId)
        setStatusMessage("Location sharing stopped, but we couldn't clear the last location. Please try again.")
        setStatusIsError(true)
      }
    }
  }, [clearResources, supabase])

  const startSharing = useCallback(async (orderId: string) => {
    const session = sessionRef.current + 1
    sessionRef.current = session
    clearResources()
    activeOrderRef.current = orderId
    setSharingOrderId(orderId)
    setStatusOrderId(orderId)
    setStatusMessage("Waiting for a GPS location…")
    setStatusIsError(false)
    setLastUpdatedAt(null)
    setIsStarting(true)

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      await stopSharing("Location services aren't available in this browser.", true)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (sessionRef.current !== session) return
    if (!user) {
      await stopSharing("Sign in again to share your location.", true)
      return
    }

    riderIdRef.current = user.id
    const requestWakeLock = async () => {
      const wakeLockApi = (navigator as WakeLockNavigator).wakeLock
      if (!wakeLockApi || document.visibilityState !== "visible") return
      try {
        const wakeLock = await wakeLockApi.request("screen")
        if (sessionRef.current !== session) {
          await wakeLock.release()
          return
        }
        wakeLockRef.current = wakeLock
      } catch {
        // Location sharing continues if the browser doesn't grant a wake lock.
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void requestWakeLock()
      else wakeLockRef.current = null
    }
    visibilityHandlerRef.current = onVisibilityChange
    document.addEventListener("visibilitychange", onVisibilityChange)
    await requestWakeLock()
    if (sessionRef.current !== session) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (sessionRef.current !== session) return
        const now = Date.now()
        if (now - lastWriteAttemptRef.current < 5_000) return
        lastWriteAttemptRef.current = now
        const updatedAt = new Date(now)
        const write = (async () => {
          try {
            const { error } = await supabase.from("rider_locations").upsert({
              rider_id: user.id,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
              updated_at: updatedAt.toISOString(),
            }, { onConflict: "rider_id" })
            if (sessionRef.current !== session) return
            if (error) {
              setStatusMessage("We couldn't update your location. Checking again shortly.")
              setStatusIsError(true)
              return
            }
            setLastUpdatedAt(updatedAt)
            setStatusMessage(null)
            setStatusIsError(false)
          } catch {
            if (sessionRef.current === session) {
              setStatusMessage("We couldn't update your location. Checking again shortly.")
              setStatusIsError(true)
            }
          }
        })()
        pendingWriteRef.current = write
        void write.finally(() => {
          if (pendingWriteRef.current === write) pendingWriteRef.current = null
        })
      },
      (error) => {
        if (sessionRef.current !== session) return
        if (error.code === error.PERMISSION_DENIED) {
          void stopSharing("Location permission was denied. Allow location access in your browser settings to share.", true)
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setStatusMessage("Your current location is unavailable. Check GPS and try again.")
          setStatusIsError(true)
        } else {
          setStatusMessage("Location timed out. Move to an open area and try again.")
          setStatusIsError(true)
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    )
    setIsStarting(false)
  }, [clearResources, stopSharing, supabase])

  const toggleSharing = useCallback((orderId: string) => {
    if (activeOrderRef.current === orderId) void stopSharing()
    else void startSharing(orderId)
  }, [startSharing, stopSharing])

  useEffect(() => {
    if (!sharingOrderId || isLoading || hasError) return
    const activeOrder = orders.find((order) => order.id === sharingOrderId)
    if (!activeOrder || activeOrder.status === "delivered") void stopSharing(null)
  }, [hasError, isLoading, orders, sharingOrderId, stopSharing])

  useEffect(() => () => {
    sessionRef.current += 1
    clearResources()
  }, [clearResources])

  return {
    sharingOrderId,
    statusOrderId,
    statusMessage,
    statusIsError,
    lastUpdatedAt,
    isStarting,
    toggleSharing,
  }
}
