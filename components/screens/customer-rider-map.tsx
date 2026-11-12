"use client"

import { useEffect, useMemo, useState } from "react"
import { divIcon, type LatLngTuple } from "leaflet"
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet"
import useSWR from "swr"
import { MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface CustomerRiderMapProps {
  riderId: string
  riderName: string
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

function FollowRider({ position }: { position: LatLngTuple }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(position, Math.max(map.getZoom(), 15), { animate: true, duration: 0.7 })
  }, [map, position])
  return null
}

function formatLocationAge(seconds: number) {
  return `Updated ${seconds} ${seconds === 1 ? "second" : "seconds"} ago`
}

export default function CustomerRiderMap({ riderId, riderName }: CustomerRiderMapProps) {
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
            <FollowRider position={position} />
            <Marker position={position} icon={riderIcon} title={riderName} alt={`${riderName} location`} />
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
            : formatLocationAge(secondsAgo)
          : "Location updates appear here as your rider shares them."}
      </p>
    </section>
  )
}
