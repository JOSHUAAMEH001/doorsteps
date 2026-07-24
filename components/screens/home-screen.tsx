"use client"

import Image from "next/image"
import {
  Bell,
  Bike,
  ChevronRight,
  MapPin,
  Package,
  Search,
  ShoppingBasket,
  Truck,
  Utensils,
} from "lucide-react"
import { VendorCard, VendorTile } from "@/components/app/cards"
import {
  categories,
  formatNaira,
  recentOrders,
  vendors,
  type CategoryId,
} from "@/lib/data"
import { useApp } from "@/lib/store"

const categoryIcons: Record<CategoryId, typeof Utensils> = {
  food: Utensils,
  groceries: ShoppingBasket,
  errands: Package,
  waybill: Truck,
}

export function HomeScreen() {
  const { navigate, userName } = useApp()
  const activeOrder = recentOrders.find((o) => o.status === "on_the_way")

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-brand px-5 pb-6 pt-6 text-brand-foreground">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-brand-foreground/80">
              Deliver to
            </p>
            <button
              type="button"
              className="mt-0.5 flex items-center gap-1 text-sm font-bold"
            >
              <MapPin className="h-4 w-4" /> ESUT Agbani, Hostel B
              <ChevronRight className="h-4 w-4 rotate-90" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate("notifications")}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand-foreground/15"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-foreground" />
          </button>
        </div>

        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
          Hi {userName}, what would you like today?
        </h1>

        <button
          type="button"
          onClick={() => navigate("vendors", { category: "food" })}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-background px-4 py-3.5 text-left"
        >
          <Search className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Search food, groceries, vendors...
          </span>
        </button>
      </div>

      {/* Categories */}
      <section className="px-5 pt-6">
        <div className="grid grid-cols-4 gap-3">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat.id]
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => navigate("vendors", { category: cat.id })}
                className="flex flex-col items-center gap-2"
              >
                <span className="flex h-16 w-full items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Active order tracker */}
      {activeOrder ? (
        <section className="px-5 pt-6">
          <button
            type="button"
            onClick={() => navigate("tracking", { vendorId: activeOrder.vendorId })}
            className="flex w-full items-center gap-3 rounded-3xl border border-brand/20 bg-brand-soft p-4 text-left"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-brand-foreground">
              <Bike className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">
                Order on the way • {activeOrder.eta}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {activeOrder.vendorName} • {activeOrder.id}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-brand" />
          </button>
        </section>
      ) : null}

      {/* Promo banner */}
      <section className="px-5 pt-6">
        <div className="relative overflow-hidden rounded-3xl bg-foreground p-5 text-background">
          <div className="relative z-10 max-w-[62%]">
            <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-brand-foreground">
              NEW USER
            </span>
            <h3 className="mt-3 text-lg font-extrabold leading-tight">
              Get {formatNaira(1000)} off your first order
            </h3>
            <p className="mt-1 text-xs text-background/70">
              Use code AGBANI10 at checkout.
            </p>
          </div>
          <Image
            src="/food-jollof.png"
            alt=""
            width={130}
            height={130}
            className="absolute -bottom-3 -right-3 h-32 w-32 rounded-full object-cover"
          />
        </div>
      </section>

      {/* Popular vendors */}
      <section className="pt-7">
        <div className="px-5">
          <SectionHeader
            title="Popular vendors"
            onSeeAll={() => navigate("vendors", { category: "food" })}
          />
        </div>
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pt-3">
          {vendors.slice(0, 4).map((v) => (
            <VendorTile key={v.id} vendor={v} />
          ))}
        </div>
      </section>

      {/* Featured restaurants */}
      <section className="px-5 pt-7">
        <SectionHeader
          title="Featured restaurants"
          onSeeAll={() => navigate("vendors", { category: "food" })}
        />
        <div className="mt-3 space-y-4">
          {vendors
            .filter((v) => v.category === "food")
            .slice(0, 3)
            .map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
        </div>
      </section>

      {/* Recent orders */}
      <section className="px-5 pt-7">
        <SectionHeader
          title="Recent orders"
          onSeeAll={() => navigate("orders")}
        />
        <div className="mt-3 space-y-3">
          {recentOrders.slice(0, 2).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() =>
                o.status === "on_the_way"
                  ? navigate("tracking", { vendorId: o.vendorId })
                  : navigate("orders")
              }
              className="flex w-full items-center gap-3 rounded-3xl border border-border bg-card p-3.5 text-left"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <Utensils className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {o.vendorName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {o.items.length} item(s) • {formatNaira(o.total)}
                </p>
              </div>
              <span className="text-xs font-semibold text-brand">Reorder</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string
  onSeeAll?: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-extrabold tracking-tight text-foreground">
        {title}
      </h2>
      {onSeeAll ? (
        <button
          type="button"
          onClick={onSeeAll}
          className="text-xs font-bold text-brand"
        >
          See all
        </button>
      ) : null}
    </div>
  )
}
