"use client"

import dynamic from "next/dynamic"
import useSWR from "swr"
import { Bike, CircleX, Headphones, MapPin, PackageCheck, RefreshCw } from "lucide-react"
import { getCustomerOrderForTracking, type CustomerTracking } from "@/app/actions/tracking"
import { useApp } from "@/lib/store"
import { LoadingState, ScreenHeader } from "@/components/app/ui"
import type { OrderStatus } from "@/lib/order-status"
import { cn } from "@/lib/utils"
import { formatNaira } from "@/lib/data"

const CustomerRiderMap = dynamic(() => import("@/components/screens/customer-rider-map"), {
  ssr: false,
  loading: () => <div role="status" className="mx-5 mb-4 flex h-[280px] items-center justify-center rounded-3xl border border-border bg-secondary text-sm text-muted-foreground sm:h-[320px]">Connecting to the live map…</div>,
})

/** Customer-facing timeline. Each step maps to a real `orders.status` value. */
const STEPS: { status: Exclude<OrderStatus, "cancelled">; label: string; desc: string }[] = [
  { status: "pending", label: "Order placed", desc: "Waiting for the vendor to accept" },
  { status: "confirmed", label: "Order accepted", desc: "The vendor is preparing your order" },
  { status: "assigned", label: "Rider assigned", desc: "Your rider is heading to the vendor" },
  { status: "picked_up", label: "On the way", desc: "Your rider has your order and is coming to you" },
  { status: "delivered", label: "Delivered", desc: "Enjoy your order" },
]

const HEADLINE: Record<OrderStatus, string> = {
  pending: "Waiting for the vendor",
  confirmed: "Being prepared",
  assigned: "Rider heading to the vendor",
  picked_up: "On the way to you",
  delivered: "Delivered",
  cancelled: "Order cancelled",
}

const isLive = (status: OrderStatus) => status === "assigned" || status === "picked_up"

export function TrackingScreen() {
  const { navigate, params, orderId } = useApp()
  const orderCode = (params.orderCode ?? orderId ?? "").trim()
  const { data: result, error, isLoading, mutate, isValidating } = useSWR(
    orderCode ? ["customer-tracking", orderCode] : null,
    () => getCustomerOrderForTracking(orderCode),
    {
      // Keep the status current until the order is finished.
      refreshInterval: (latest) =>
        latest?.data && (latest.data.status === "delivered" || latest.data.status === "cancelled") ? 0 : 15_000,
      revalidateOnFocus: true,
      keepPreviousData: true,
    },
  )
  const order = result?.data ?? null

  return (
    <div className="flex min-h-full flex-col bg-background">
      <ScreenHeader title="Track order" subtitle={orderCode ? `Order ${orderCode}` : undefined} />

      {!orderCode ? (
        <Message title="No order selected" body="Open an order from My orders to track it." action={{ label: "Go to my orders", onClick: () => navigate("orders") }} />
      ) : isLoading && !result ? (
        <LoadingState label="Loading your order…" />
      ) : error || result?.error === "failed" ? (
        <Message title="We couldn't load your order" body="Check your connection and try again." action={{ label: isValidating ? "Retrying…" : "Try again", onClick: () => void mutate() }} />
      ) : result?.error === "signed_out" ? (
        <Message title="Log in to track your order" body="Your session has ended. Log in again to see live updates." action={{ label: "Log in", onClick: () => navigate("auth") }} />
      ) : !order ? (
        <Message title="Order not found" body={`We couldn't find order ${orderCode} on your account.`} action={{ label: "Go to my orders", onClick: () => navigate("orders") }} />
      ) : (
        <TrackingDetails order={order} onSupport={() => navigate("support")} />
      )}
    </div>
  )
}

function TrackingDetails({ order, onSupport }: { order: CustomerTracking; onSupport: () => void }) {
  const live = isLive(order.status) && order.riderId
  const cancelled = order.status === "cancelled"
  const currentIndex = STEPS.findIndex((s) => s.status === order.status)

  return (
    <>
      {live ? (
        <CustomerRiderMap riderId={order.riderId!} riderName={order.riderName} dropoff={order.dropoff} />
      ) : (
        <div className="mx-5 mb-4 flex h-40 flex-col items-center justify-center gap-2 rounded-3xl border border-border bg-secondary px-6 text-center">
          {cancelled ? <CircleX aria-hidden="true" className="size-6 text-destructive" /> : order.status === "delivered" ? <PackageCheck aria-hidden="true" className="size-6 text-success" /> : <MapPin aria-hidden="true" className="size-6 text-muted-foreground" />}
          <p className="text-sm font-semibold text-foreground">
            {cancelled ? "This order was cancelled" : order.status === "delivered" ? "Your order has been delivered" : "The live map appears once a rider is assigned"}
          </p>
        </div>
      )}

      <div className="flex-1 space-y-4 px-5 pb-5">
        <div className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Order status</p>
            <p role="status" aria-live="polite" className={cn("text-xl font-extrabold", cancelled ? "text-destructive" : "text-foreground")}>{HEADLINE[order.status]}</p>
            {order.vendorName ? <p className="mt-0.5 truncate text-xs text-muted-foreground">From {order.vendorName}</p> : null}
          </div>
          {!cancelled && order.status !== "delivered" ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-bold text-brand">
              <RefreshCw aria-hidden="true" className="size-3" />Live
            </span>
          ) : null}
        </div>

        {live ? (
          <div className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"><Bike aria-hidden="true" className="size-6" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{order.riderName}</p>
              <p className="text-xs text-muted-foreground">DOORS rider</p>
            </div>
            <button type="button" onClick={onSupport} className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-bold text-foreground transition-transform active:scale-95">
              <Headphones aria-hidden="true" className="size-4" />Get help
            </button>
          </div>
        ) : null}

        {order.dropoffLocation ? (
          <div className="rounded-3xl border border-border bg-card p-4 text-sm shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">Delivering to</p>
            <p className="mt-0.5 font-semibold text-foreground">{order.dropoffLocation}</p>
          </div>
        ) : null}

        {order.items.length ? (
          <div className="rounded-3xl border border-border bg-card p-4 text-sm shadow-sm">
            <h2 className="text-xs font-medium text-muted-foreground">Order summary</h2>
            <ul className="mt-1 space-y-0.5 text-foreground">
              {order.items.map((item, i) => <li key={`${item.name}-${i}`}>{item.quantity}× {item.name}</li>)}
            </ul>
            {order.total != null ? <p className="mt-2 font-extrabold text-foreground">{formatNaira(order.total)}</p> : null}
          </div>
        ) : null}

        {cancelled ? (
          <div className="rounded-3xl border border-destructive/15 bg-destructive/5 p-4 text-sm text-destructive">
            This order was cancelled. If you were charged or think this is a mistake, contact support.
            <button type="button" onClick={onSupport} className="mt-3 block font-bold underline underline-offset-2">Contact support</button>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-foreground">Order progress</h2>
            <ol>
              {STEPS.map((s, i) => {
                const done = i < currentIndex || order.status === "delivered"
                const active = i === currentIndex && order.status !== "delivered"
                const isLast = i === STEPS.length - 1
                return (
                  <li key={s.status} className="flex gap-3" aria-current={active ? "step" : undefined}>
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors",
                        done && "border-brand bg-brand text-brand-foreground",
                        active && "border-brand bg-brand-soft text-brand",
                        !done && !active && "border-border bg-background text-muted-foreground",
                      )}>
                        {done ? "✓" : i + 1}
                      </span>
                      {!isLast && <span className={cn("my-1 w-0.5 flex-1 rounded-full", done ? "bg-brand" : "bg-border")} style={{ minHeight: 28 }} />}
                    </div>
                    <div className={cn("pb-4", isLast && "pb-0")}>
                      <p className={cn("text-sm font-semibold", active || done ? "text-foreground" : "text-muted-foreground")}>{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>
    </>
  )
}

function Message({ title, body, action }: { title: string; body: string; action: { label: string; onClick: () => void } }) {
  return (
    <div className="mx-5 mt-4 rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
      <p className="text-base font-bold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <button type="button" onClick={action.onClick} className="mt-4 min-h-11 rounded-2xl bg-brand px-5 text-sm font-bold text-brand-foreground">{action.label}</button>
    </div>
  )
}
