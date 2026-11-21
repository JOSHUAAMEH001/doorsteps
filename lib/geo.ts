/** Rough bounding box for Nigeria. Coordinates outside it are treated as "no location". */
export const NIGERIA_BOUNDS = { minLat: 4, maxLat: 14, minLng: 2.5, maxLng: 15 } as const

/** ESUT Agbani, used to centre maps when we have nothing better. */
export const ESUT_AGBANI = { lat: 6.3239, lng: 7.5552 } as const

export function isNigeriaCoordinate(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" && typeof lng === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= NIGERIA_BOUNDS.minLat && lat <= NIGERIA_BOUNDS.maxLat &&
    lng >= NIGERIA_BOUNDS.minLng && lng <= NIGERIA_BOUNDS.maxLng
  )
}

/** Returns the pair when it is a valid Nigerian coordinate, otherwise nulls. */
export function sanitizeDropoff(lat: unknown, lng: unknown): { lat: number | null; lng: number | null } {
  return isNigeriaCoordinate(lat, lng) ? { lat, lng: lng as number } : { lat: null, lng: null }
}
