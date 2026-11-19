"use client"

import useSWR from "swr"
import { getCurrentProfile, getVendorOrders, type Role } from "@/app/actions/roles"
import { formatNaira } from "@/lib/data"
import { LoadingState, ScreenHeader } from "@/components/app/ui"
import { AdminDashboard } from "@/components/dashboard/admin-dashboard"
import { VendorDashboard } from "@/components/dashboard/vendor-dashboard"
import { RiderDashboard } from "@/components/dashboard/rider-dashboard"

function SafeMessage({ error }: { error?: string | null }) {
  return error ? <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">Could not load. Please refresh.</p> : null
}

function CustomerDashboard() {
  const { data, isLoading } = useSWR("role-customer-orders", getVendorOrders)
  const orders = data?.data ?? []
  return (
    <div className="pb-8">
      <ScreenHeader title="My orders" subtitle="Your latest Doorsteps orders" />
      <div className="flex flex-col gap-3 px-5 pt-5">
        {isLoading ? <LoadingState label="Loading orders..." /> : null}
        <SafeMessage error={data?.error} />
        {!isLoading && !data?.error && orders.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">You have no orders yet.</p> : null}
        {orders.map((order: any) => <OrderCard key={order.id} order={order} />)}
      </div>
    </div>
  )
}

function OrderCard({ order }: { order: any }) {
  return (
    <article className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-extrabold text-foreground">{order.order_code}</p><p className="mt-1 text-xs text-muted-foreground">{order.customer_name} · {order.phone}</p></div>
        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold capitalize text-brand">{order.status.replace("_", " ")}</span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Dropoff: {order.dropoff_location}</p>
      <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">{(order.order_items ?? []).map((item: any) => <li key={`${item.item_name}-${item.quantity}`}>{item.quantity}x {item.item_name} · {formatNaira(item.unit_price)}</li>)}</ul>
      <div className="mt-4 flex items-center justify-between"><span className="text-sm font-extrabold">{formatNaira(order.total)}</span></div>
    </article>
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
  if (!data?.data || (data.data.role !== role && !adminPreview)) return <p className="p-6 text-sm text-muted-foreground">You don&apos;t have access to this section.</p>
  if (role === "vendor") return <VendorDashboard preview={adminPreview} />
  if (role === "rider") return <RiderDashboard preview={adminPreview} />
  if (role === "admin") return <AdminDashboard />
  return <CustomerDashboard />
}
