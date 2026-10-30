"use client"

import { Loader2, Package, Search, SlidersHorizontal, Truck, X } from "lucide-react"
import { useMemo, useState } from "react"
import { ScreenHeader, Pill, PrimaryButton } from "@/components/app/ui"
import { VendorCard } from "@/components/app/cards"
import { submitOrder } from "@/app/actions/order"
import { categories, vendors, type CategoryId } from "@/lib/data"
import { useApp } from "@/lib/store"

type SortKey = "recommended" | "rating" | "delivery" | "distance"

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "rating", label: "Top rated" },
  { key: "delivery", label: "Fastest delivery" },
  { key: "distance", label: "Nearest" },
]

export function VendorsScreen() {
  const { params, navigate } = useApp()
  const initial = (params.category as CategoryId) || "food"
  const [category, setCategory] = useState<CategoryId>(initial)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("recommended")
  const [showFilter, setShowFilter] = useState(false)

  const activeCategory = categories.find((c) => c.id === category)

  const list = useMemo(() => {
    let items = vendors.filter((v) => v.category === category)
    if (query.trim()) {
      const q = query.toLowerCase()
      items = items.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    items = [...items].sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating
      if (sort === "delivery") return a.deliveryMins - b.deliveryMins
      if (sort === "distance") return a.distanceKm - b.distanceKm
      return b.reviews - a.reviews
    })
    return items
  }, [category, query, sort])

  const isService = category === "errands" || category === "waybill"

  return (
    <div className="pb-8">
      <ScreenHeader title={activeCategory?.label} subtitle={activeCategory?.description} />

      <div className="sticky top-[57px] z-20 space-y-3 border-b border-border bg-background px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${activeCategory?.label.toLowerCase()}...`}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilter((s) => !s)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-brand-foreground"
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <Pill
              key={c.id}
              active={c.id === category}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </Pill>
          ))}
        </div>

        {showFilter ? (
          <div className="animate-fade-in-up rounded-2xl border border-border bg-card p-3">
            <p className="mb-2 text-xs font-bold text-foreground">Sort by</p>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((o) => (
                <Pill
                  key={o.key}
                  active={sort === o.key}
                  onClick={() => setSort(o.key)}
                >
                  {o.label}
                </Pill>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {isService ? (
        <ServicePanel category={category} onStart={() => navigate("home")} />
      ) : (
        <div className="space-y-4 px-5 pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            {list.length} vendors near you
          </p>
          {list.map((v) => (
            <VendorCard key={v.id} vendor={v} />
          ))}
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <X className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">No vendors found</p>
              <p className="text-xs text-muted-foreground">
                Try a different search or category.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function ServicePanel({
  category,
  onStart,
}: {
  category: CategoryId
  onStart: () => void
}) {
  const isErrand = category === "errands"
  const [customerName, setCustomerName] = useState("")
  const [phone, setPhone] = useState("")
  const [pickup, setPickup] = useState("")
  const [dropoff, setDropoff] = useState("")
  const [details, setDetails] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  async function submitOrder() {
    setError("")
    if (!customerName.trim() || !phone.trim() || !pickup.trim() || !dropoff.trim() || !details.trim()) {
      setError("Please complete all fields before submitting your order.")
      return
    }
    setIsSubmitting(true)
    const result = await submitOrder({
      customerName,
      phone,
      pickupLocation: pickup,
      dropOffLocation: dropoff,
      itemDescription: details,
    })

    if (!result.ok) {
      setError(result.message)
      setIsSubmitting(false)
      return
    }

    setSubmitted(true)
    setIsSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="space-y-5 px-5 pt-5">
        <div className="rounded-3xl border border-success/20 bg-success-soft p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success text-white">
            <Truck className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-extrabold text-foreground">Order submitted</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Thanks, {customerName.split(" ")[0]}. Our team will contact you shortly to confirm your delivery.
          </p>
        </div>
        <PrimaryButton onClick={onStart}>Back to home</PrimaryButton>
      </div>
    )
  }

  return (
    <div className="space-y-5 px-5 pt-5">
      <div className="flex items-center gap-3 rounded-3xl bg-brand-soft p-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-foreground">
          {isErrand ? <Package className="h-6 w-6" /> : <Truck className="h-6 w-6" />}
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">
            {isErrand ? "Request an errand" : "Send a waybill"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isErrand ? "We buy or pick up anything for you around Agbani." : "Send parcels within campus and to nearby parks."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Customer name" value={customerName} onChange={setCustomerName} placeholder="e.g. Chiamaka" />
        <Field label="Phone number" value={phone} onChange={setPhone} placeholder="0803 123 4567" type="tel" />
      </div>
      <Field
        label={isErrand ? "What should we get / do?" : "Item description"}
        value={details}
        onChange={setDetails}
        placeholder={isErrand ? "e.g. Buy recharge card and drop at hostel" : "e.g. Documents, small box"}
      />
      <Field label="Pickup location" value={pickup} onChange={setPickup} placeholder="e.g. Agbani main market" />
      <Field label="Drop-off location" value={dropoff} onChange={setDropoff} placeholder="e.g. ESUT Hostel B, Room 12" />

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Estimated fee</span>
          <span className="font-bold text-foreground">₦800 - ₦1,500</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Final fee is confirmed by your rider based on distance.</p>
      </div>

      {error ? <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p> : null}
      <PrimaryButton onClick={submitOrder} disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting order...</> : "Submit order"}
      </PrimaryButton>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand"
      />
    </div>
  )
}
