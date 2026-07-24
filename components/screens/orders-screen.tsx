"use client"

import { useState } from "react"
import { ChevronRight, Package } from "lucide-react"
import { useApp } from "@/lib/store"
import { ScreenHeader, Pill, PrimaryButton } from "@/components/app/ui"
import { recentOrders, formatNaira, type OrderStatus } from "@/lib/data"
import { cn } from "@/lib/utils"

const statusLabel: Record<OrderStatus, string> = {
  preparing: "Preparing",
  on_the_way: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

const statusStyle: Record<OrderStatus, string> = {
  preparing: "bg-warning-soft text-warning-strong",
  on_the_way: "bg-brand-soft text-brand",
  delivered: "bg-success-soft text-success",
  cancelled: "bg-secondary text-muted-foreground",
}

type Tab = "active" | "completed"

export function OrdersScreen() {
  const { navigate } = useApp()
  const [tab, setTab] = useState<Tab>("active")

  const active = recentOrders.filter(
    (o) => o.status === "preparing" || o.status === "on_the_way",
  )
  const completed = recentOrders.filter(
    (o) => o.status === "delivered" || o.status === "cancelled",
  )
  const list = tab === "active" ? active : completed

  return (
    <div className="flex min-h-full flex-col bg-background pb-24">
      <ScreenHeader title="My orders" />

      <div className="flex gap-2 px-5 pb-3 pt-1">
        <Pill active={tab === "active"} onClick={() => setTab("active")}>
          Active ({active.length})
        </Pill>
        <Pill active={tab === "completed"} onClick={() => setTab("completed")}>
          Completed ({completed.length})
        </Pill>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Package className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">No orders here yet</p>
          <p className="text-xs text-muted-foreground">
            When you place an order it will appear here so you can track it.
          </p>
          <div className="w-full max-w-[200px]">
            <PrimaryButton onClick={() => navigate("home")}>Start ordering</PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="space-y-3 px-5">
          {list.map((o) => (
            <button
              type="button"
              key={o.id}
              onClick={() =>
                o.status === "on_the_way" || o.status === "preparing"
                  ? navigate("tracking")
                  : navigate("vendor", { vendorId: o.vendorId })
              }
              className="w-full rounded-3xl border border-border bg-card p-4 text-left shadow-sm transition-transform active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{o.id}</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-bold",
                    statusStyle[o.status],
                  )}
                >
                  {statusLabel[o.status]}
                </span>
              </div>
              <p className="mt-1.5 text-sm font-bold text-foreground">{o.vendorName}</p>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {o.items.map((it) => `${it.qty}x ${it.name}`).join(", ")}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">{o.placedAt}</p>
                  <p className="text-sm font-extrabold text-foreground">
                    {formatNaira(o.total)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                  {o.status === "on_the_way" || o.status === "preparing"
                    ? "Track order"
                    : "Reorder"}
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
