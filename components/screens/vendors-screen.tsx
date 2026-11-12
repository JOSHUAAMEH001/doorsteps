"use client"

import { Search, SlidersHorizontal, X } from "lucide-react"
import { useMemo, useState } from "react"
import useSWR from "swr"
import { getVendors } from "@/app/actions/catalog"
import { ScreenHeader, Pill } from "@/components/app/ui"
import { VendorCard, VendorCardSkeleton } from "@/components/app/cards"
import { categories, type CategoryId, type Vendor } from "@/lib/data"
import { useApp } from "@/lib/store"

type SortKey = "recommended" | "rating" | "delivery"

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "rating", label: "Top rated" },
  { key: "delivery", label: "Fastest delivery" },
]

export function VendorsScreen() {
  const { params } = useApp()
  const initial = (params.category as CategoryId) || "food"
  const [category, setCategory] = useState<CategoryId>(initial)
  const databaseCategory = category === "food" ? "Food" : category === "groceries" ? "Groceries" : undefined
  const { data: vendorRows = [], isLoading: vendorsLoading, error: vendorsError } = useSWR(
    ["vendors-by-category", databaseCategory ?? "all"],
    () => getVendors(databaseCategory),
  )
  const vendors = useMemo<Vendor[]>(() => vendorRows.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    category: String(vendor.category).toLowerCase() as CategoryId,
    image: vendor.image_url ?? "",
    rating: vendor.rating,
    deliveryMins: vendor.delivery_minutes,
    deliveryFee: null,
    isOpen: vendor.is_active,
  })), [vendorRows])
  const [query, setQuery] = useState(() => params.searchQuery ?? "")
  const [sort, setSort] = useState<SortKey>("recommended")
  const [showFilter, setShowFilter] = useState(false)
  const activeCategory = categories.find((item) => item.id === category)

  const list = useMemo(() => {
    let items = vendors.filter((vendor) => vendor.category === category)
    const search = query.trim().toLowerCase()
    if (search) {
      items = items.filter((vendor) =>
        vendor.name.toLowerCase().includes(search) || vendor.category.toLowerCase().includes(search),
      )
    }
    return [...items].sort((a, b) => {
      if (sort === "rating") return (b.rating ?? -1) - (a.rating ?? -1)
      if (sort === "delivery") return (a.deliveryMins ?? Infinity) - (b.deliveryMins ?? Infinity)
      return a.name.localeCompare(b.name)
    })
  }, [category, query, sort, vendors])

  return (
    <div className="pb-8">
      <ScreenHeader title={activeCategory?.label} subtitle={activeCategory?.description} />
      <div className="sticky top-[57px] z-20 space-y-3 border-b border-border bg-background px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${activeCategory?.label.toLowerCase()}...`}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilter((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-brand-foreground"
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {categories.map((item) => (
            <Pill key={item.id} active={item.id === category} onClick={() => setCategory(item.id)}>
              {item.label}
            </Pill>
          ))}
        </div>
        {showFilter ? (
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="mb-2 text-xs font-bold text-foreground">Sort by</p>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((option) => (
                <Pill key={option.key} active={sort === option.key} onClick={() => setSort(option.key)}>
                  {option.label}
                </Pill>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-4 px-5 pt-4">
        {vendorsError ? <p role="alert" className="py-8 text-center text-sm text-muted-foreground">Could not load. Please refresh.</p> : null}
        {vendorsLoading ? <div className="flex flex-col gap-4"><VendorCardSkeleton /><VendorCardSkeleton /><VendorCardSkeleton /></div> : null}
        {!vendorsError && !vendorsLoading && list.length > 0 ? <p className="text-xs font-medium text-muted-foreground">{list.length} vendors near you</p> : null}
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 xl:grid-cols-3">
          {!vendorsError && !vendorsLoading && list.map((vendor, index) => <VendorCard key={vendor.id} vendor={vendor} priority={index === 0} />)}
        </div>
        {!vendorsError && !vendorsLoading && list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <X className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">No vendors yet</p>
            <p className="text-xs text-muted-foreground">There are no active vendors in this category.</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
