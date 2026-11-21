"use client"

import { ArrowLeft, Bike, Clock, Heart, Minus, Plus, Star } from "lucide-react"
import { CatalogImage } from "@/components/app/catalog-image"
import { useMemo, useState } from "react"
import useSWR from "swr"
import { getMenuItems } from "@/app/actions/catalog"
import { formatNaira, type Product } from "@/lib/data"
import { useApp } from "@/lib/store"
import { cn } from "@/lib/utils"
import { PrimaryButton, ScreenHeader } from "@/components/app/ui"

export function VendorScreen() {
  const { params, back, navigate, addToCart, updateQty, cart, vendors, vendorsLoading } = useApp()
  const qtyInCart = useMemo(() => new Map(cart.map((line) => [line.product.id, line.qty])), [cart])
  const vendor = vendors.find((v) => v.id === params.vendorId)
  const { data: menuRows = [], isLoading, error: menuError } = useSWR(
    vendor ? ["menu-items", vendor.id] : null,
    ([, vendorId]) => getMenuItems(vendorId),
  )
  const items = useMemo<Product[]>(
    () => menuRows.map((item) => ({
      id: item.id,
      vendorId: item.vendor_id,
      name: item.name,
      description: item.description ?? "",
      price: item.price,
      image: item.image_url ?? "",
      group: "Menu",
    })),
    [menuRows],
  )

  const groups = useMemo(() => {
    const map = new Map<string, typeof items>()
    for (const p of items) {
      map.set(p.group, [...(map.get(p.group) ?? []), p])
    }
    return Array.from(map.entries())
  }, [items])

  const [activeGroup, setActiveGroup] = useState(groups[0]?.[0] ?? "")

  if (!vendor) {
    return (
      <div className="flex min-h-full flex-col">
        <ScreenHeader title="Restaurant" />
        {vendorsLoading ? (
          <p role="status" className="p-6 text-sm text-muted-foreground">Loading restaurant…</p>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-sm font-semibold text-foreground">This restaurant isn&apos;t available right now.</p>
            <div className="w-full max-w-[220px]"><PrimaryButton onClick={() => navigate("home")}>Browse restaurants</PrimaryButton></div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="pb-8">
      {/* Banner */}
      <div className="relative h-52 w-full">
        <CatalogImage name={vendor.name} imageUrl={vendor.image} sizes="(min-width: 1024px) 720px, 100vw" priority fallbackClassName="text-2xl" />
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
            <p className="mt-0.5 text-sm text-muted-foreground">{vendor.category}</p>
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
          <InfoStat icon={Star} label={vendor.rating === null ? "No rating" : String(vendor.rating)} sub="Rating" />
          <InfoStat icon={Clock} label={vendor.deliveryMins === null ? "Not listed" : `${vendor.deliveryMins} min`} sub="Delivery" />
          <InfoStat icon={Bike} label="Delivery" sub="Fee shown at checkout" />
        </div>


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
        {menuError ? <p role="alert" className="py-12 text-center text-sm text-muted-foreground">Could not load. Please refresh.</p> : null}
        {isLoading ? (
          <div role="status" aria-label="Loading menu items" className="flex flex-col gap-3">
            <div aria-hidden="true" className="h-4 w-24 rounded bg-secondary" />
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} aria-hidden="true" className="flex gap-3 rounded-3xl border border-border bg-card p-3">
                <div className="flex flex-1 flex-col gap-3 py-2">
                  <div className="h-4 w-3/4 rounded bg-secondary" />
                  <div className="h-3 w-full rounded bg-secondary" />
                  <div className="h-3 w-1/3 rounded bg-secondary" />
                </div>
                <div className="size-24 shrink-0 rounded-2xl bg-secondary" />
              </div>
            ))}
          </div>
        ) : null}
        {!menuError && !isLoading && groups.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">No menu items yet.</p> : null}
        {groups.map(([group, groupItems]) => (
          <section key={group} id={`group-${group}`} className="scroll-mt-32 pb-6">
            <h2 className="mb-3 text-base font-extrabold text-foreground">{group}</h2>
            <div className="space-y-3">
              {groupItems.map((p, index) => (
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
                    <CatalogImage name={p.name} imageUrl={p.image} sizes="96px" priority={index === 0} className="rounded-2xl object-cover" fallbackClassName="text-[10px] leading-tight" />
                    <QuantityControl
                      name={p.name}
                      qty={qtyInCart.get(p.id) ?? 0}
                      onAdd={() => addToCart(p, 1)}
                      onRemove={() => updateQty(p.id, (qtyInCart.get(p.id) ?? 0) - 1)}
                    />
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

/** "+" adds one plate; once in the cart it becomes  − 2 +  so taps show the running count. */
function QuantityControl({ name, qty, onAdd, onRemove }: { name: string; qty: number; onAdd: () => void; onRemove: () => void }) {
  if (qty <= 0) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-md active:scale-90"
        aria-label={`Add ${name} to cart`}
      >
        <Plus className="h-4 w-4" strokeWidth={2.6} />
      </button>
    )
  }
  return (
    <div className="absolute -bottom-2 -right-2 flex h-9 items-center rounded-full bg-brand text-brand-foreground shadow-md">
      <button type="button" onClick={onRemove} aria-label={`Remove one ${name}`} className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90">
        <Minus className="h-4 w-4" strokeWidth={2.6} />
      </button>
      <span aria-live="polite" aria-label={`${qty} in cart`} className="min-w-5 text-center text-sm font-extrabold tabular-nums">{qty}</span>
      <button type="button" onClick={onAdd} aria-label={`Add another ${name}`} className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90">
        <Plus className="h-4 w-4" strokeWidth={2.6} />
      </button>
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
