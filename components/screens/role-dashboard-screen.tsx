"use client"

import useSWR from "swr"
import { ChevronRight, MapPin } from "lucide-react"
import { getCurrentProfile, getVendorOrders, type Role } from "@/app/actions/roles"
import { formatNaira } from "@/lib/data"
import { useApp } from "@/lib/store"
import { LoadingState, ScreenHeader } from "@/components/app/ui"
import { AdminDashboard } from "@/components/dashboard/admin-dashboard"
import { VendorDashboard } from "@/components/dashboard/vendor-dashboard"
import { RiderDashboard } from "@/components/dashboard/rider-dashboard"
import { OrdersScreen } from "@/components/screens/orders-screen"
import { cn } from "@/lib/utils"
import { isTrackable } from "@/lib/order-status"

function SafeMessage({ error }: { error?: string | null }) {
  return error ? <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">Could not load. Please refresh.</p> : null
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning-soft text-warning-strong",
  confirmed: "bg-warning-soft text-warning-strong",
  assigned: "bg-brand-soft text-brand",
  picked_up: "bg-brand-soft text-brand",
  delivered: "bg-success-soft text-success",
  cancelled: "bg-secondary text-muted-foreground",
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Accepted",
  assigned: "Rider assigned",
  picked_up: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

function CustomerDashboard() {
  const { navigate } = useApp()
  const { data, isLoading } = useSWR("role-customer-orders", getVendorOrders)
  const orders = data?.data ?? []
  return (
    <div className="pb-8">
      <ScreenHeader title="My orders" subtitle="Your latest Doorsteps orders" />
      <div className="flex flex-col gap-3 px-5 pt-5">
        {isLoading ? <LoadingState label="Loading orders..." /> : null}
        <SafeMessage error={data?.error} />
        {!isLoading && !data?.error && orders.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">You have no orders yet.</p> : null}
        {orders.map((order: any) => {
          const trackable = isTrackable(order.status)
          return (
            <article
              key={order.id}
              role={trackable ? "button" : undefined}
              tabIndex={trackable ? 0 : undefined}
              onClick={trackable ? () => navigate("tracking", { orderCode: order.order_code }) : undefined}
              onKeyDown={trackable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("tracking", { orderCode: order.order_code }) } } : undefined}
              className={cn(
                "rounded-3xl border border-border bg-card p-4 shadow-sm",
                trackable && "cursor-pointer transition-transform active:scale-[0.99]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-foreground">{order.order_code}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{order.customer_name} · {order.phone}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", STATUS_STYLE[order.status] ?? "bg-secondary text-muted-foreground")}>
                  {STATUS_LABEL[order.status] ?? order.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Dropoff: {order.dropoff_location}</p>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">{(order.order_items ?? []).map((item: any) => <li key={`${item.item_name}-${item.quantity}`}>{item.quantity}x {item.item_name} · {formatNaira(item.unit_price)}</li>)}</ul>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-extrabold">{formatNaira(order.total)}</span>
                {trackable ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                    <MapPin aria-hidden="true" className="size-3.5" />Track order<ChevronRight className="size-4" />
                  </span>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Client-side gate for the UI only. Real enforcement happens in the server
 * actions (role re-check) and Supabase RLS, so a tampered client still gets no data.
 * Admins may open the vendor and rider dashboards as a read-only preview.
 */
export function RoleDashboardScreen({ role }: { role: Role }) {
  const { data, isLoading } = useSWR("current-profile", getCurrentProfile)
  if (isLoading) return <LoadingState label="Loading your dashboard..." className="min-h-48 w-full" />
  const adminPreview = data?.data?.role === "admin" && (role === "vendor" || role === "rider")
  // The Orders tab is for everyone: guests, vendors, riders and admins see their own orders list.
  if (role === "customer" && data?.data?.role !== "customer") return <OrdersScreen />
  if (!data?.data || (data.data.role !== role && !adminPreview)) return <p className="p-6 text-sm text-muted-foreground">You don&apos;t have access to this section.</p>
  if (role === "vendor") return <VendorDashboard preview={adminPreview} />
  if (role === "rider") return <RiderDashboard preview={adminPreview} />
  if (role === "admin") return <AdminDashboard />
  return <CustomerDashboard />
}
