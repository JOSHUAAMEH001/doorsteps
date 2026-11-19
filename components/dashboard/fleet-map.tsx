"use client"

import { useEffect, useMemo } from "react"
import { divIcon, latLngBounds, type LatLngTuple } from "leaflet"
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"

/** ESUT Agbani campus, used when no rider is sharing a location. */
const ESUT_AGBANI: LatLngTuple = [6.3076, 7.5197]

export type FleetMarker = { id: string; lat: number; lng: number; title: string; subtitle: string; stale: boolean }

const liveIcon = divIcon({
  className: "doorsteps-rider-marker",
  html: '<span class="doorsteps-rider-marker__pin" aria-hidden="true"><span></span></span>',
  iconSize: [42, 48],
  iconAnchor: [21, 44],
  popupAnchor: [0, -40],
})

const staleIcon = divIcon({
  className: "doorsteps-rider-marker doorsteps-rider-marker--stale",
  html: '<span class="doorsteps-rider-marker__pin" aria-hidden="true" style="background:#71717a"><span style="background:#71717a"></span></span>',
  iconSize: [42, 48],
  iconAnchor: [21, 44],
  popupAnchor: [0, -40],
})

function FitToMarkers({ markers }: { markers: FleetMarker[] }) {
  const map = useMap()
  const key = markers.map((m) => m.id).join(",")
  useEffect(() => {
    if (markers.length === 0) return
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 15)
      return
    }
    map.fitBounds(latLngBounds(markers.map((m) => [m.lat, m.lng] as LatLngTuple)), { padding: [40, 40], maxZoom: 16 })
    // Refit only when the set of riders changes, not on every position update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])
  return null
}

export default function FleetMap({ markers, className }: { markers: FleetMarker[]; className?: string }) {
  const center = useMemo<LatLngTuple>(() => (markers[0] ? [markers[0].lat, markers[0].lng] : ESUT_AGBANI), [markers])
  return (
    <div className={className ?? "h-[360px] w-full overflow-hidden rounded-xl bg-secondary"} role="region" aria-label={`Live map with ${markers.length} rider${markers.length === 1 ? "" : "s"}`}>
      <MapContainer center={center} zoom={15} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToMarkers markers={markers} />
        {markers.map((marker) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={marker.stale ? staleIcon : liveIcon} title={marker.title} alt={marker.title}>
            <Popup>
              <strong>{marker.title}</strong>
              <br />
              {marker.subtitle}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
