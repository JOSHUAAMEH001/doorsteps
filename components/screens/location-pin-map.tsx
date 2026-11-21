"use client"

import { useEffect, useMemo } from "react"
import { divIcon, type LatLngTuple, type Marker as LeafletMarker } from "leaflet"
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet"

const pinIcon = divIcon({
  className: "",
  html: '<span style="display:block;width:30px;height:30px;border-radius:9999px 9999px 9999px 0;background:#D71920;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);transform:rotate(-45deg)" aria-hidden="true"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
})

function Recenter({ position }: { position: LatLngTuple }) {
  const map = useMap()
  const [lat, lng] = position
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 17), { animate: true })
  }, [map, lat, lng])
  return null
}

/** Small map with a draggable pin. Calls onMove when the customer finishes dragging. */
export default function LocationPinMap({ lat, lng, onMove }: { lat: number; lng: number; onMove: (lat: number, lng: number) => void }) {
  const position = useMemo<LatLngTuple>(() => [lat, lng], [lat, lng])
  const handlers = useMemo(() => ({
    dragend(event: { target: LeafletMarker }) {
      const next = event.target.getLatLng()
      onMove(next.lat, next.lng)
    },
  }), [onMove])

  return (
    <div className="h-44 w-full overflow-hidden rounded-2xl border border-border bg-secondary">
      <MapContainer center={position} zoom={17} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter position={position} />
        <Marker position={position} icon={pinIcon} draggable eventHandlers={handlers} title="Your drop-off point" alt="Your drop-off point. Drag to adjust." keyboard />
      </MapContainer>
    </div>
  )
}
