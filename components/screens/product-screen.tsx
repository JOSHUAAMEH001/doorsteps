"use client"

import { ArrowLeft, Minus, Plus } from "lucide-react"
import { CatalogImage } from "@/components/app/catalog-image"
import { useState } from "react"
import useSWR from "swr"
import { getMenuItem } from "@/app/actions/catalog"
import { formatNaira, type Product } from "@/lib/data"
import { useApp } from "@/lib/store"
import { ScreenHeader } from "@/components/app/ui"

export function ProductScreen() {
  const { params, back, navigate, addToCart } = useApp()
  const { data: row, isLoading, error } = useSWR(
    params.productId ? ["menu-item", params.productId] : null,
    ([, id]) => getMenuItem(id),
  )
  const product: Product | null = row ? {
    id: row.id,
    vendorId: row.vendor_id,
    name: row.name,
    description: row.description ?? "",
    price: row.price,
    image: row.image_url ?? "",
    group: "Menu",
  } : null
  const videoUrl = row?.video_url ?? null
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState("")

  if (error) return <div className="flex min-h-full flex-col"><ScreenHeader title="Menu item" /><p role="alert" className="p-6 text-sm text-muted-foreground">We couldn&apos;t load this item. Check your connection and try again.</p></div>
  if (isLoading) return (
    <div role="status" aria-label="Loading menu item" className="flex min-h-full flex-col">
      <div aria-hidden="true" className="h-72 w-full bg-secondary" />
      <div aria-hidden="true" className="flex flex-col gap-4 px-5 pt-5">
        <div className="h-6 w-2/3 rounded bg-secondary" />
        <div className="h-4 w-1/3 rounded bg-secondary" />
        <div className="h-20 w-full rounded-2xl bg-secondary" />
      </div>
    </div>
  )
  if (!product) return <div className="flex min-h-full flex-col"><ScreenHeader title="Menu item" /><p className="p-6 text-sm text-muted-foreground">This menu item isn&apos;t available anymore.</p></div>

  const total = product.price * qty

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar flex-1 overflow-y-auto pb-4">
        {/* Image */}
        <div className="relative h-72 w-full bg-secondary">
          <CatalogImage name={product.name} imageUrl={product.image} sizes="(min-width: 1024px) 720px, 100vw" priority fallbackClassName="text-2xl" />
          {videoUrl ? (
            <video
              src={videoUrl}
              poster={product.image || undefined}
              controls
              playsInline
              muted
              preload="metadata"
              aria-label={`${product.name} video`}
              className="absolute inset-0 size-full bg-black object-contain"
            />
          ) : null}
          <button
            type="button"
            onClick={back}
            className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground active:scale-90"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">
              {product.name}
            </h1>
            <p className="shrink-0 text-lg font-extrabold text-brand">
              {formatNaira(product.price)}
            </p>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          {/* Notes */}
          <div className="mt-6">
            <label className="text-sm font-bold text-foreground">
              Notes for vendor
            </label>
            <p className="text-xs text-muted-foreground">
              Add special instructions (optional)
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Extra pepper, no onions, well done"
              className="mt-2 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </div>

          {/* Quantity */}
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
            <span className="text-sm font-bold text-foreground">Quantity</span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-foreground active:scale-90"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-base font-bold text-foreground">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-foreground active:scale-90"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add to cart bar */}
      <div className="border-t border-border bg-background px-5 py-4">
        <button
          type="button"
          onClick={() => {
            // Opens the cart once the item is in (after "Start a new cart?" if needed).
            addToCart(product, qty, note || undefined, () => navigate("cart"))
          }}
          className="flex w-full items-center justify-between rounded-2xl bg-brand px-5 py-4 text-sm font-bold text-brand-foreground transition-transform active:scale-[0.98]"
        >
          <span>Add {qty} to cart</span>
          <span>{formatNaira(total)}</span>
        </button>
      </div>
    </div>
  )
}
