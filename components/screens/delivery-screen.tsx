"use client"

import { Building2, Clock, LoaderCircle, MapPin, Phone } from "lucide-react"
import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState } from "react"
import { reverseGeocode } from "@/app/actions/geocode"
import { ScreenHeader, PrimaryButton } from "@/components/app/ui"
import { isNigeriaCoordinate } from "@/lib/geo"
import { useApp } from "@/lib/store"
import { cn } from "@/lib/utils"

const LocationPinMap = dynamic(() => import("@/components/screens/location-pin-map"), {
  ssr: false,
  loading: () => <div role="status" className="flex h-44 items-center justify-center rounded-2xl border border-border bg-secondary text-xs text-muted-foreground">Loading map…</div>,
})

const PINNED_FALLBACK = "Pinned location near ESUT Agbani"

type LocateState =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "pinned"; lat: number; lng: number; accuracy: number | null; geocoding: boolean }
  | { kind: "error"; message: string }

/** Plain-language messages for each way getting the location can fail. */
function locationErrorMessage(code: number) {
  if (code === 1) return "Allow location access in your browser settings, or type your address."
  if (code === 3) return "Finding your location took too long. Try again near a window or outdoors, or type your address."
  return "We couldn't find your location. Check that location (GPS) is turned on, or type your address."
}

const timeOptions = ["As soon as possible", "In 30 minutes", "In 1 hour", "Schedule"]
const NG_PHONE = /^(0|\+?234)?[789][01]\d{8}$/

export function DeliveryScreen() {
  const { navigate, setDeliveryDetails } = useApp()
  const [address, setAddress] = useState("")
  const [landmark, setLandmark] = useState("")
  const [locate, setLocate] = useState<LocateState>({ kind: "idle" })
  // Ignore geocoding answers for a pin the customer has since moved.
  const geocodeRequest = useRef(0)
  // Once the customer edits the address themselves, a later pin move doesn't overwrite it.
  const addressEdited = useRef(false)
  const [phone, setPhone] = useState("")
  const [instructions, setInstructions] = useState("")
  const [time, setTime] = useState(timeOptions[0])
  const [error, setError] = useState("")

  // Prefill the customer's OWN last address and phone on this device (no sample data).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("doors-delivery") ?? "null") as { address?: string; phone?: string; landmark?: string } | null
      if (saved?.address) setAddress(saved.address)
      if (saved?.phone) setPhone(saved.phone)
      if (saved?.landmark) setLandmark(saved.landmark)
    } catch { /* storage unavailable */ }
  }, [])

  /** Pins a point, then fills the address from OpenStreetMap (still editable). */
  const pinAt = useCallback(async (lat: number, lng: number, accuracy: number | null) => {
    if (!isNigeriaCoordinate(lat, lng)) {
      setLocate({ kind: "error", message: "That location is outside our delivery area. Type your address instead." })
      return
    }
    const request = ++geocodeRequest.current
    setLocate({ kind: "pinned", lat, lng, accuracy, geocoding: true })
    let found: string | null = null
    try {
      const result = await reverseGeocode(lat, lng)
      if (result.ok) found = result.address
    } catch {
      // Network or server problem: keep the pin and use the fallback text.
    }
    if (request !== geocodeRequest.current) return
    setLocate({ kind: "pinned", lat, lng, accuracy, geocoding: false })
    if (!addressEdited.current) setAddress(found ?? PINNED_FALLBACK)
  }, [])

  function locateMe() {
    setError("")
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setLocate({ kind: "error", message: "Location only works on the secure (https) version of the site. Type your address instead." })
      return
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocate({ kind: "error", message: "Your browser can't share your location. Type your address instead." })
      return
    }
    addressEdited.current = false
    setLocate({ kind: "locating" })
    navigator.geolocation.getCurrentPosition(
      (position) => { void pinAt(position.coords.latitude, position.coords.longitude, position.coords.accuracy) },
      (failure) => setLocate({ kind: "error", message: locationErrorMessage(failure.code) }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    )
  }

  const movePin = useCallback((lat: number, lng: number) => { void pinAt(lat, lng, null) }, [pinAt])

  function continueToPayment() {
    const cleanAddress = address.trim()
    const cleanLandmark = landmark.trim()
    if (cleanAddress.length < 4) {
      setError("Enter your delivery address, or use your current location.")
      return
    }
    if (cleanLandmark.length < 2) {
      setError("Add your room, hostel or a landmark so the rider can find you.")
      return
    }
    if (!NG_PHONE.test(phone.replace(/[\s-]/g, ""))) {
      setError("Enter a valid Nigerian phone number, e.g. 0803 000 0000.")
      return
    }
    setError("")
    // Only the typed details are remembered on this device, never the coordinates.
    try { localStorage.setItem("doors-delivery", JSON.stringify({ address: cleanAddress, phone: phone.trim(), landmark: cleanLandmark })) } catch { /* storage unavailable */ }
    const pinned = locate.kind === "pinned" ? locate : null
    setDeliveryDetails({
      address: cleanAddress,
      landmark: cleanLandmark,
      phone,
      instructions,
      time,
      dropoffLat: pinned?.lat ?? null,
      dropoffLng: pinned?.lng ?? null,
    })
    navigate("payment")
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Delivery details" subtitle="Step 1 of 2" />

      <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-5 py-4">
        {/* Address */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">Delivery address</h2>
          <button
            type="button"
            onClick={locateMe}
            disabled={locate.kind === "locating"}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-brand bg-brand-soft px-4 text-sm font-bold text-brand transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            {locate.kind === "locating"
              ? <><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Finding your location…</>
              : <><span aria-hidden="true">📍</span> {locate.kind === "pinned" ? "Update my current location" : "Use my current location"}</>}
          </button>
          {locate.kind === "error" ? (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{locate.message}</p>
          ) : null}
          {locate.kind === "pinned" ? (
            <div className="space-y-1.5">
              <LocationPinMap lat={locate.lat} lng={locate.lng} onMove={movePin} />
              <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
                {locate.geocoding
                  ? "Looking up the address for this pin…"
                  : `Pin set${locate.accuracy ? ` (accurate to about ${Math.round(locate.accuracy)} m)` : ""}. Drag it to your exact spot if needed.`}
              </p>
            </div>
          ) : null}
          <div className="flex items-start gap-2 rounded-2xl border border-border bg-background px-4 py-3 focus-within:border-brand">
            <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <textarea
              value={address}
              onChange={(e) => { addressEdited.current = true; setAddress(e.target.value) }}
              rows={2}
              maxLength={200}
              aria-label="Delivery address"
              autoComplete="street-address"
              placeholder="Where should we deliver? e.g. your hostel, block and room number"
              className="flex-1 resize-none bg-transparent text-sm outline-none"
            />
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-foreground">Room / hostel / landmark <span className="font-medium text-destructive">*</span></span>
            <span className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 focus-within:border-brand">
              <Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                required
                aria-required="true"
                maxLength={120}
                placeholder="e.g. Hostel B, Room 12, opposite the chapel"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </span>
          </label>
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
