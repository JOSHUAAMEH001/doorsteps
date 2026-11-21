"use server"

import { isNigeriaCoordinate } from "@/lib/geo"

export type ReverseGeocodeResult = { ok: true; address: string } | { ok: false }

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
const SITE_URL = "https://www.doorsteps.com.ng"
// Nominatim's usage policy asks for an identifying User-Agent and Referer.
const HEADERS = {
  "User-Agent": `DOORS-delivery/1.0 (+${SITE_URL})`,
  Referer: SITE_URL,
  "Accept-Language": "en",
}

type NominatimAddress = Partial<Record<
  "amenity" | "building" | "house_number" | "road" | "neighbourhood" | "suburb" | "quarter" | "village" | "town" | "city" | "county" | "state",
  string
>>

/** Builds a short, rider-friendly address ("Hostel B, Agbani Road, Agbani") from Nominatim's parts. */
function shortAddress(name: string | undefined, address: NominatimAddress | undefined, displayName: string | undefined) {
  const parts = [
    name || address?.amenity || address?.building,
    [address?.house_number, address?.road].filter(Boolean).join(" "),
    address?.neighbourhood || address?.suburb || address?.quarter,
    address?.village || address?.town || address?.city || address?.county,
  ].map((part) => part?.trim()).filter((part): part is string => Boolean(part))
  const unique = parts.filter((part, i) => parts.indexOf(part) === i)
  const text = unique.length >= 2 ? unique.join(", ") : displayName?.split(",").slice(0, 4).join(",").trim()
  return text ? text.slice(0, 200) : null
}

/**
 * Turns the customer's pinned coordinates into a readable address with OpenStreetMap Nominatim.
 * Runs on the server so the request carries our identifying headers. Never throws: on any
 * failure the delivery screen falls back to "Pinned location near ESUT Agbani".
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  if (!isNigeriaCoordinate(lat, lng)) return { ok: false }
  const url = new URL(NOMINATIM_URL)
  url.search = new URLSearchParams({
    format: "jsonv2",
    lat: lat.toFixed(6),
    lon: lng.toFixed(6),
    zoom: "18",
    addressdetails: "1",
  }).toString()

  try {
    const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(6_000), cache: "no-store" })
    if (!response.ok) {
      console.error("[geocode] nominatim responded", response.status)
      return { ok: false }
    }
    const body = (await response.json()) as { name?: string; display_name?: string; address?: NominatimAddress; error?: string }
    if (body.error) return { ok: false }
    const address = shortAddress(body.name, body.address, body.display_name)
    return address ? { ok: true, address } : { ok: false }
  } catch (error) {
    console.error("[geocode] reverse geocoding failed", error instanceof Error ? error.message : error)
    return { ok: false }
  }
}
