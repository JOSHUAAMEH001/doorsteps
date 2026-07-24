"use client"

import Image from "next/image"
import { ArrowLeft, Minus, Plus, Star } from "lucide-react"
import { useState } from "react"
import { formatNaira, products } from "@/lib/data"
import { useApp } from "@/lib/store"

export function ProductScreen() {
  const { params, back, navigate, addToCart } = useApp()
  const product = products.find((p) => p.id === params.productId) ?? products[0]
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState("")

  const total = product.price * qty

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar flex-1 overflow-y-auto pb-4">
        {/* Image */}
        <div className="relative h-72 w-full bg-secondary">
          <Image
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-cover"
            sizes="420px"
            priority
          />
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

          <div className="mt-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-foreground">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" /> 4.8
            </span>
            <span>•</span>
            <span>320+ orders</span>
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
            addToCart(product, qty, note || undefined)
            navigate("cart")
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
