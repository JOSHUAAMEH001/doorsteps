"use client"

import Image from "next/image"
import { ArrowLeft, Bike, Clock, Heart, MapPin, Plus, Star } from "lucide-react"
import { useMemo, useState } from "react"
import { formatNaira, products, vendors } from "@/lib/data"
import { useApp } from "@/lib/store"
import { cn } from "@/lib/utils"

export function VendorScreen() {
  const { params, back, navigate, addToCart } = useApp()
  const vendor = vendors.find((v) => v.id === params.vendorId) ?? vendors[0]
  const items = useMemo(
    () => products.filter((p) => p.vendorId === vendor.id),
    [vendor.id],
  )
  const groups = useMemo(() => {
    const map = new Map<string, typeof items>()
    for (const p of items) {
      map.set(p.group, [...(map.get(p.group) ?? []), p])
    }
    return Array.from(map.entries())
  }, [items])

  const [activeGroup, setActiveGroup] = useState(groups[0]?.[0] ?? "")

  return (
    <div className="pb-8">
      {/* Banner */}
      <div className="relative h-52 w-full">
        <Image
          src={vendor.banner || "/placeholder.svg"}
          alt={vendor.name}
          fill
          className="object-cover"
          sizes="420px"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <button
            type="button"
            onClick={back}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground active:scale-90"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground active:scale-90"
            aria-label="Save vendor"
          >
            <Heart className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Store info */}
      <div className="-mt-6 rounded-t-3xl bg-background px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">
              {vendor.name}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{vendor.type}</p>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-bold",
              vendor.isOpen ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground",
            )}
          >
            {vendor.isOpen ? "Open now" : "Closed"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <InfoStat icon={Star} label={`${vendor.rating} (${vendor.reviews})`} sub="Rating" />
          <InfoStat icon={Clock} label={`${vendor.deliveryMins} min`} sub="Delivery" />
          <InfoStat icon={Bike} label={formatNaira(vendor.deliveryFee)} sub="Fee" />
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {vendor.distanceKm} km away • Agbani, Enugu
        </div>

        {vendor.promo ? (
          <div className="mt-4 rounded-2xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand">
            {vendor.promo}
          </div>
        ) : null}
      </div>

      {/* Category tabs */}
      <div className="no-scrollbar sticky top-[57px] z-20 mt-4 flex gap-2 overflow-x-auto border-b border-border bg-background px-5 py-3">
        {groups.map(([group]) => (
          <button
            key={group}
            type="button"
            onClick={() => {
              setActiveGroup(group)
              document
                .getElementById(`group-${group}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-colors",
              activeGroup === group
                ? "bg-brand text-brand-foreground"
                : "bg-secondary text-muted-foreground",
            )}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Products */}
      <div className="px-5 pt-5">
        {groups.map(([group, groupItems]) => (
          <section key={group} id={`group-${group}`} className="scroll-mt-32 pb-6">
            <h2 className="mb-3 text-base font-extrabold text-foreground">{group}</h2>
            <div className="space-y-3">
              {groupItems.map((p) => (
                <div
                  key={p.id}
                  className="flex gap-3 rounded-3xl border border-border bg-card p-3"
                >
                  <button
                    type="button"
                    onClick={() => navigate("product", { productId: p.id })}
                    className="min-w-0 flex-1 text-left"
                  >
                    {p.popular ? (
                      <span className="mb-1 inline-block rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">
                        Popular
                      </span>
                    ) : null}
                    <h3 className="font-bold text-foreground">{p.name}</h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {p.description}
                    </p>
                    <p className="mt-2 text-sm font-bold text-foreground">
                      {formatNaira(p.price)}
                    </p>
                  </button>
                  <div className="relative h-24 w-24 shrink-0">
                    <Image
                      src={p.image || "/placeholder.svg"}
                      alt={p.name}
                      fill
                      className="rounded-2xl object-cover"
                      sizes="96px"
                    />
                    <button
                      type="button"
                      onClick={() => addToCart(p, 1)}
                      className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-md active:scale-90"
                      aria-label={`Add ${p.name} to cart`}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.6} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function InfoStat({
  icon: Icon,
  label,
  sub,
}: {
  icon: typeof Star
  label: string
  sub: string
}) {
  return (
    <div className="rounded-2xl bg-secondary px-3 py-2.5 text-center">
      <Icon className="mx-auto h-4 w-4 text-brand" />
      <p className="mt-1 text-xs font-bold text-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  )
}
