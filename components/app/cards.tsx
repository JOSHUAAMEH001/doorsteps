"use client"

import { Bike, Clock } from "lucide-react"
import { CatalogImage } from "@/components/app/catalog-image"
import { Rating } from "@/components/app/ui"
import { formatNaira, type Vendor } from "@/lib/data"
import { useApp } from "@/lib/store"
import { cn } from "@/lib/utils"

export function VendorCardSkeleton() {
  return (
    <div aria-hidden="true" className="w-full overflow-hidden rounded-3xl border border-border bg-card">
      <div className="h-36 w-full bg-secondary" />
      <div className="flex flex-col gap-3 p-3.5">
        <div className="h-4 w-2/3 rounded bg-secondary" />
        <div className="h-3 w-1/3 rounded bg-secondary" />
        <div className="h-3 w-1/2 rounded bg-secondary" />
      </div>
    </div>
  )
}

export function VendorTileSkeleton() {
  return (
    <div aria-hidden="true" className="w-40 shrink-0 overflow-hidden rounded-3xl border border-border bg-card">
      <div className="h-24 w-full bg-secondary" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3 w-4/5 rounded bg-secondary" />
        <div className="h-3 w-1/2 rounded bg-secondary" />
      </div>
    </div>
  )
}

export function VendorCard({ vendor, priority = false }: { vendor: Vendor; priority?: boolean }) {
  const { navigate } = useApp()
  return (
    <button
      type="button"
      onClick={() => navigate("vendor", { vendorId: vendor.id })}
      className="w-full overflow-hidden rounded-3xl border border-border bg-card text-left transition-transform active:scale-[0.99]"
    >
      <div className="relative h-36 w-full">
        <CatalogImage name={vendor.name} imageUrl={vendor.image} sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" priority={priority} />
        <span
          className={cn(
            "absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold",
            vendor.isOpen
              ? "bg-background/90 text-success"
              : "bg-foreground/80 text-background",
          )}
        >
          {vendor.isOpen ? "Open" : "Closed"}
        </span>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-foreground">{vendor.name}</h3>
          {vendor.rating !== null ? <Rating value={vendor.rating} /> : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{vendor.category}</p>
        <div className="mt-3 flex items-center gap-3 text-xs font-medium text-muted-foreground">
          {vendor.deliveryMins !== null ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {vendor.deliveryMins} min</span> : null}
          {vendor.deliveryFee !== null ? <span className="inline-flex items-center gap-1"><Bike className="h-3.5 w-3.5" /> {formatNaira(vendor.deliveryFee)}</span> : null}
        </div>
      </div>
    </button>
  )
}

export function VendorTile({ vendor, priority = false }: { vendor: Vendor; priority?: boolean }) {
  const { navigate } = useApp()
  return (
    <button
      type="button"
      onClick={() => navigate("vendor", { vendorId: vendor.id })}
      className="w-40 shrink-0 overflow-hidden rounded-3xl border border-border bg-card text-left transition-transform active:scale-[0.98]"
    >
      <div className="relative h-24 w-full">
        <CatalogImage name={vendor.name} imageUrl={vendor.image} sizes="(min-width: 1024px) 160px, 40vw" priority={priority} className="object-cover" fallbackClassName="text-sm" />
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-bold text-foreground">{vendor.name}</h3>
        <div className="mt-1 flex items-center justify-between">
          {vendor.rating !== null ? <Rating value={vendor.rating} /> : <span className="text-[11px] text-muted-foreground">No rating yet</span>}
          {vendor.deliveryMins !== null ? <span className="text-[11px] font-medium text-muted-foreground">{vendor.deliveryMins} min</span> : null}
        </div>
      </div>
    </button>
  )
}
