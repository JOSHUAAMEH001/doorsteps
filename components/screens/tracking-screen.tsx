"use client"

import dynamic from "next/dynamic"
import Image from "next/image"
import useSWR from "swr"
import { Phone, MessageCircle, MapPin } from "lucide-react"
import { getCustomerOrderForTracking } from "@/app/actions/tracking"
import { useApp } from "@/lib/store"
import { ScreenHeader } from "@/components/app/ui"
import { formatNaira, orderStatusSteps } from "@/lib/data"
import { cn } from "@/lib/utils"

const CustomerRiderMap = dynamic(() => import("@/components/screens/customer-rider-map"), {
  ssr: false,
  loading: () => <div role="status" className="mx-5 mb-4 flex h-[280px] items-center justify-center rounded-3xl border border-border bg-secondary text-sm text-muted-foreground sm:h-[320px]">Connecting to the live map…</div>,
})

function statusToStep(status: string): number {
  const index = orderStatusSteps.findIndex((s) => s.key === status)
  if (status === "delivered") return orderStatusSteps.length - 1
  if (status === "pending") return -1
  return index >= 0 ? index : 0
}

export function TrackingScreen() {
  const { navigate, params, orderId } = useApp()
  const trackingOrderCode = params.orderCode ?? orderId ?? ""
  const { data: trackingResult } = useSWR(
    trackingOrderCode ? `customer-tracking:${trackingOrderCode}` : null,
    () => getCustomerOrderForTracking(trackingOrderCode),
    { refreshInterval: 10_000, revalidateOnFocus: true },
  )
  const liveTracking = trackingResult?.data
  const orderStatus = liveTracking?.status ?? "pending"
  const step = statusToStep(orderStatus)
  const isRiderTrackingActive = Boolean(
    liveTracking?.riderId && ["assigned", "picked_up"].includes(orderStatus),
  )
  const riderName = liveTracking?.riderName ?? "Your rider"
  const delivered = orderStatus === "delivered"
  const cancelled = orderStatus === "cancelled"

  return (
    <div className="flex min-h-full flex-col bg-background">
      <ScreenHeader title="Track order" subtitle={`Order ${params.orderCode ?? ""}`} />

      {isRiderTrackingActive && liveTracking?.riderId ? (
        <CustomerRiderMap riderId={liveTracking.riderId} riderName={riderName} />
      ) : (
        <div className="relative h-56 w-full overflow-hidden">
          <Image
            src="/map-route.png"
            alt="Delivery route map"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/30" />
          <div className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg shadow-brand/40">
            {!isRiderTrackingActive && !delivered && !cancelled && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/40" />
            )}
            <MapPin className="relative h-5 w-5" />
          </div>
        </div>
      )}

      <div className="flex-1 space-y-4 p-5">
        {/* Status card */}
        <div className="flex items-center justify-between rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {delivered ? "Order status" : cancelled ? "Order status" : "Current status"}
            </p>
            <p className="text-2xl font-extrabold text-foreground">
              {delivered ? "Delivered" : cancelled ? "Cancelled" : orderStatusSteps[Math.max(0, step)]?.label ?? "Processing"}
            </p>
            {liveTracking?.vendorName ? (
              <p className="mt-1 text-xs text-muted-foreground">From {liveTracking.vendorName}</p>
            ) : null}
          </div>
          <div className={cn(
            "rounded-full px-4 py-2 text-xs font-bold",
            delivered ? "bg-success-soft text-success" : cancelled ? "bg-secondary text-muted-foreground" : "bg-brand-soft text-brand",
          )}>
            {delivered ? "Complete" : cancelled ? "Cancelled" : orderStatusSteps[Math.max(0, step)]?.label ?? "Pending"}
          </div>
        </div>

        {/* Rider card — only when a rider is assigned */}
        {liveTracking?.riderId && !cancelled ? (
          <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Image
                src="/rider-avatar.png"
                alt={`${riderName} profile`}
                width={52}
                height={52}
                className="h-13 w-13 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{riderName}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Your rider</span>
                  {isRiderTrackingActive ? (
                    <>
                      <span aria-hidden>•</span>
                      <span className="flex items-center gap-1 text-emerald-600">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Sharing location
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Message rider"
                  onClick={() => navigate("support")}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground transition-transform active:scale-90"
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Call rider"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-brand-foreground transition-transform active:scale-90"
                >
                  <Phone className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Order summary */}
        {liveTracking?.items?.length ? (
          <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-bold text-foreground">Order summary</h2>
            <p className="mt-2 text-xs text-muted-foreground">{liveTracking.items.join(", ")}</p>
            {liveTracking.total != null ? (
              <p className="mt-2 text-sm font-extrabold">{formatNaira(liveTracking.total)}</p>
            ) : null}
          </div>
        ) : null}

        {/* Timeline */}
        {!cancelled ? (
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-foreground">Order progress</h2>
            <ol className="space-y-0">
              {orderStatusSteps.map((s, i) => {
                const done = i <= step && step >= 0
                const active = i === step && !delivered
                const isLast = i === orderStatusSteps.length - 1
                return (
                  <li key={s.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors",
                          done && "border-brand bg-brand text-brand-foreground",
                          active && "border-brand bg-brand-soft text-brand",
                          !done && !active && "border-border bg-background text-muted-foreground",
                        )}
                      >
                        {done && !active ? "✓" : i + 1}
                      </span>
                      {!isLast && (
                        <span
                          className={cn(
                            "my-1 w-0.5 flex-1 rounded-full transition-colors",
                            done && !active ? "bg-brand" : "bg-border",
                          )}
                          style={{ minHeight: 28 }}
                        />
                      )}
                    </div>
                    <div className={cn("pb-4", isLast && "pb-0")}>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          active || done ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {s.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        ) : null}
      </div>
    </div>
  )
}
