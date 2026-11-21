"use client"

import { useEffect, useMemo, useState } from "react"
import { divIcon, latLngBounds, type LatLngTuple } from "leaflet"
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet"
import useSWR from "swr"
import { MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface CustomerRiderMapProps {
  riderId: string
  riderName: string
  /** Customer's pinned drop-off point, when they shared one at checkout. */
  dropoff?: { lat: number; lng: number } | null
}

interface RiderLocation {
  rider_id: string
  lat: number
  lng: number
  accuracy: number | null
  heading: number | null
  speed: number | null
  updated_at: string
}

function parseLocation(value: unknown): RiderLocation | null {
  if (!value || typeof value !== "object") return null
  const row = value as Partial<RiderLocation>
  const lat = Number(row.lat)
  const lng = Number(row.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  if (typeof row.rider_id !== "string" || typeof row.updated_at !== "string") return null
  return {
    rider_id: row.rider_id,
    lat,
    lng,
    accuracy: row.accuracy ?? null,
    heading: row.heading ?? null,
    speed: row.speed ?? null,
    updated_at: row.updated_at,
  }
}

const riderIcon = divIcon({
  className: "doorsteps-rider-marker",
  html: '<span class="doorsteps-rider-marker__pin" aria-hidden="true"><span></span></span>',
  iconSize: [42, 48],
  iconAnchor: [21, 44],
})

const dropoffIcon = divIcon({
  className: "",
  html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#16a34a;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)" aria-hidden="true"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

function FollowRider({ position, dropoff }: { position: LatLngTuple; dropoff: LatLngTuple | null }) {
  const map = useMap()
  const [lat, lng] = position
  const [dLat, dLng] = dropoff ?? [null, null]
  useEffect(() => {
    if (dLat !== null && dLng !== null) {
      map.flyToBounds(latLngBounds([[lat, lng], [dLat, dLng]]), { padding: [40, 40], maxZoom: 16, duration: 0.7 })
    } else {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { animate: true, duration: 0.7 })
    }
  }, [map, lat, lng, dLat, dLng])
  return null
}

/** Straight-line distance in metres (haversine). Not a road route, so shown as "about". */
function distanceMetres(a: LatLngTuple, b: LatLngTuple) {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function formatDistance(metres: number) {
  if (metres < 100) return "under 100 m"
  if (metres < 1_000) return `about ${Math.round(metres / 50) * 50} m`
  return `about ${(metres / 1_000).toFixed(1)} km`
}

function formatLocationAge(seconds: number) {
  return `Updated ${seconds} ${seconds === 1 ? "second" : "seconds"} ago`
}

export default function CustomerRiderMap({ riderId, riderName, dropoff = null }: CustomerRiderMapProps) {
  const supabase = useMemo(() => createClient(), [])
  const [now, setNow] = useState(() => Date.now())
  const { data: location, error, mutate } = useSWR<RiderLocation | null>(
    riderId ? ["rider-location", riderId] : null,
    async () => {
      const { data, error: queryError } = await supabase
        .from("rider_locations")
        .select("rider_id, lat, lng, accuracy, heading, speed, updated_at")
        .eq("rider_id", riderId)
        .maybeSingle()
      if (queryError) throw queryError
      return parseLocation(data)
    },
    { revalidateOnFocus: true, revalidateOnReconnect: true },
  )

  useEffect(() => {
    const channel = supabase
      .channel(`rider-location-${riderId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "rider_locations",
        filter: `rider_id=eq.${riderId}`,
      }, (payload) => {
        if (payload.eventType === "DELETE") {
          void mutate(null, false)
          return
        }
        void mutate(parseLocation(payload.new), false)
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [mutate, riderId, supabase])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const timestamp = location ? new Date(location.updated_at).getTime() : Number.NaN
  const secondsAgo = Number.isFinite(timestamp) ? Math.max(0, Math.floor((now - timestamp) / 1_000)) : null
  const isPaused = secondsAgo !== null && secondsAgo > 60
  const position: LatLngTuple | null = location ? [location.lat, location.lng] : null
  const dropoffPoint = useMemo<LatLngTuple | null>(() => (dropoff ? [dropoff.lat, dropoff.lng] : null), [dropoff])
  const distance = position && dropoffPoint ? formatDistance(distanceMetres(position, dropoffPoint)) : null

  return (
    <section aria-label="Track your rider" className="mx-5 mb-4 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 px-4 py-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Track your rider</h2>
          <p className="mt-1 text-xs text-muted-foreground">{riderName}</p>
        </div>
        <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand" />
      </div>
      {position ? (
        <div role="region" aria-label={`Live map showing ${riderName}`} className="h-[280px] w-full overflow-hidden bg-secondary sm:h-[320px]">
          <MapContainer center={position} zoom={15} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FollowRider position={position} dropoff={dropoffPoint} />
            <Marker position={position} icon={riderIcon} title={riderName} alt={`${riderName} location`} />
            {dropoffPoint ? <Marker position={dropoffPoint} icon={dropoffIcon} title="Your drop-off point" alt="Your drop-off point" /> : null}
          </MapContainer>
        </div>
      ) : (
        <div className="flex h-[280px] flex-col items-center justify-center gap-2 bg-secondary px-6 text-center sm:h-[320px]">
          <MapPin aria-hidden="true" className="size-6 text-muted-foreground" />
          <p role={error ? "alert" : "status"} className="text-sm font-semibold text-foreground">
            {error ? "We couldn't load the rider's location. Please try again shortly." : "Waiting for the rider's location"}
          </p>
          {error ? <button type="button" onClick={() => void mutate()} className="text-xs font-bold text-brand underline underline-offset-2">Try again</button> : null}
        </div>
      )}
      <p role="status" aria-live="polite" className="px-4 py-3 text-xs text-muted-foreground">
        {location && secondsAgo !== null
          ? isPaused
            ? `Rider location paused · ${formatLocationAge(secondsAgo)}`
            : [distance ? `Rider is ${distance} from your drop-off point` : null, formatLocationAge(secondsAgo)].filter(Boolean).join(" · ")
          : "Location updates appear here as your rider shares them."}
      </p>
    </section>
  )
}
