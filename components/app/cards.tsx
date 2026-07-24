"use client"

import Image from "next/image"
import { Bike, Clock } from "lucide-react"
import { Rating } from "@/components/app/ui"
import { formatNaira, type Vendor } from "@/lib/data"
import { useApp } from "@/lib/store"
import { cn } from "@/lib/utils"

export function VendorCard({ vendor }: { vendor: Vendor }) {
  const { navigate } = useApp()
  return (
    <button
      type="button"
      onClick={() => navigate("vendor", { vendorId: vendor.id })}
      className="w-full overflow-hidden rounded-3xl border border-border bg-card text-left transition-transform active:scale-[0.99]"
    >
      <div className="relative h-36 w-full">
        <Image
          src={vendor.banner || "/placeholder.svg"}
          alt={vendor.name}
          fill
          className="object-cover"
          sizes="420px"
        />
        {vendor.promo ? (
          <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-brand-foreground">
            {vendor.promo}
          </span>
        ) : null}
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
          <Rating value={vendor.rating} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{vendor.type}</p>
        <div className="mt-3 flex items-center gap-3 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {vendor.deliveryMins} min
          </span>
          <span className="inline-flex items-center gap-1">
            <Bike className="h-3.5 w-3.5" /> {formatNaira(vendor.deliveryFee)}
          </span>
          <span>{vendor.distanceKm} km</span>
        </div>
      </div>
    </button>
  )
}

export function VendorTile({ vendor }: { vendor: Vendor }) {
  const { navigate } = useApp()
  return (
    <button
      type="button"
      onClick={() => navigate("vendor", { vendorId: vendor.id })}
      className="w-40 shrink-0 overflow-hidden rounded-3xl border border-border bg-card text-left transition-transform active:scale-[0.98]"
    >
      <div className="relative h-24 w-full">
        <Image
          src={vendor.banner || "/placeholder.svg"}
          alt={vendor.name}
          fill
          className="object-cover"
          sizes="160px"
        />
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-bold text-foreground">{vendor.name}</h3>
        <div className="mt-1 flex items-center justify-between">
          <Rating value={vendor.rating} />
          <span className="text-[11px] font-medium text-muted-foreground">
            {vendor.deliveryMins} min
          </span>
        </div>
      </div>
    </button>
  )
}
