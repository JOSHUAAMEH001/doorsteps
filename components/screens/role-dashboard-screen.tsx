"use client"

import useSWR from "swr"
import { useState } from "react"
import { Check, CircleX } from "lucide-react"
import {
  acceptRiderOrder,
  assignRider,
  declineRiderOrder,
  getAdminData,
  getCurrentProfile,
  getRiderEarnings,
  getRiderOrders,
  getVendorOrders,
  updateOrderStatus,
  updateRiderOrderStatus,
  type Role,
} from "@/app/actions/roles"
import { formatNaira } from "@/lib/data"
import { useApp } from "@/lib/store"
import { LoadingState, PrimaryButton, ScreenHeader } from "@/components/app/ui"
import { useRiderLocationSharing } from "@/components/screens/use-rider-location-sharing"

const statuses = ["pending", "confirmed", "assigned", "picked_up", "delivered", "cancelled"] as const
const cellClass = "whitespace-nowrap px-4 py-3 text-sm"
const headerClass = "whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground"

function SafeMessage({ error }: { error?: string | null }) {
  return error ? <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">Could not load. Please refresh.</p> : null
}

function Metric({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  const content = <><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-xl font-extrabold text-foreground">{value}</p></>
  return onClick
    ? <button type="button" onClick={onClick} className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-brand/30">{content}</button>
    : <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">{content}</div>
}

function MetricRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 px-5 pt-5 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
}

function TableFrame({ children, minWidth = "min-w-[780px]" }: { children: React.ReactNode; minWidth?: string }) {
  return <div className="overflow-x-auto rounded-2xl border border-border bg-card"><table className={`${minWidth} w-full border-collapse text-left`}>{children}</table></div>
}

function TableSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div role="status" aria-label="Loading dashboard rows" className="overflow-hidden rounded-2xl border border-border bg-card">
      {Array.from({ length: 4 }, (_, row) => (
        <div key={row} aria-hidden="true" className="flex min-w-[780px] gap-6 border-b border-border px-4 py-4 last:border-b-0">
          {Array.from({ length: columns }, (_, column) => <div key={column} className="h-4 flex-1 rounded bg-secondary" />)}
        </div>
      ))}
    </div>
  )
}

function OrderItems({ items }: { items: any[] }) {
  return <span>{items.map((item) => `${item.quantity}x ${item.item_name}`).join(", ") || "No items"}</span>
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

function OrderCard({ order, actions }: { order: any; actions?: React.ReactNode }) {
  return (
    <article className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-extrabold text-foreground">{order.order_code}</p><p className="mt-1 text-xs text-muted-foreground">{order.customer_name} · {order.phone}</p></div>
        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold capitalize text-brand">{order.status.replace("_", " ")}</span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Dropoff: {order.dropoff_location}</p>
      <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">{(order.order_items ?? []).map((item: any) => <li key={`${item.item_name}-${item.quantity}`}>{item.quantity}x {item.item_name} · {formatNaira(item.unit_price)}</li>)}</ul>
      <div className="mt-4 flex items-center justify-between"><span className="text-sm font-extrabold">{formatNaira(order.total)}</span>{actions}</div>
    </article>
  )
}

function VendorDashboard() {
  const { data, mutate, isLoading } = useSWR("role-vendor-orders", getVendorOrders)
  const [busy, setBusy] = useState<string | null>(null)
  const orders = data?.data ?? []
  const pending = orders.filter((order: any) => order.status === "pending").length
  const active = orders.filter((order: any) => ["confirmed", "assigned", "picked_up"].includes(order.status)).length
  const delivered = orders.filter((order: any) => order.status === "delivered").length

  async function update(id: string, status: string) {
    setBusy(id)
    await updateOrderStatus(id, status)
    await mutate()
    setBusy(null)
  }

  return (
    <div className="pb-8">
      <ScreenHeader title="Vendor dashboard" subtitle="Manage orders for your shop" />
      <MetricRow>
        <Metric label="Total orders" value={String(orders.length)} />
        <Metric label="Needs attention" value={String(pending)} />
        <Metric label="In progress" value={String(active)} />
        <Metric label="Delivered" value={String(delivered)} />
      </MetricRow>
      <div className="flex flex-col gap-4 px-5 pt-5">
        <SafeMessage error={data?.error} />
        {isLoading ? <TableSkeleton columns={5} /> : null}
        {!isLoading && !data?.error && orders.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">No orders yet.</p> : null}
        {!isLoading && orders.length > 0 ? (
          <TableFrame minWidth="min-w-[980px]">
            <thead><tr className="border-b border-border bg-secondary/50"><th className={headerClass}>Order</th><th className={headerClass}>Customer</th><th className={headerClass}>Items</th><th className={headerClass}>Dropoff</th><th className={headerClass}>Total</th><th className={headerClass}>Status</th><th className={headerClass}>Actions</th></tr></thead>
            <tbody>{orders.map((order: any) => (
              <tr key={order.id} className="border-b border-border last:border-0">
                <td className={`${cellClass} font-bold`}>{order.order_code}</td>
                <td className={cellClass}>{order.customer_name}<span className="block text-xs text-muted-foreground">{order.phone}</span></td>
                <td className={`${cellClass} max-w-64 whitespace-normal text-muted-foreground`}><OrderItems items={order.order_items ?? []} /></td>
                <td className={`${cellClass} max-w-56 whitespace-normal text-muted-foreground`}>{order.dropoff_location}</td>
                <td className={`${cellClass} font-bold`}>{formatNaira(order.total)}</td>
                <td className={`${cellClass} capitalize`}>{order.status.replace("_", " ")}</td>
                <td className={cellClass}>{order.status === "pending" ? <div className="flex gap-2"><button disabled={busy === order.id} onClick={() => update(order.id, "confirmed")} className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-brand-foreground"><Check aria-hidden="true" className="size-3.5" />Confirm</button><button disabled={busy === order.id} onClick={() => update(order.id, "cancelled")} className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive"><CircleX aria-hidden="true" className="size-3.5" />Cancel</button></div> : "—"}</td>
              </tr>
            ))}</tbody>
          </TableFrame>
        ) : null}
      </div>
    </div>
  )
}

function RiderDashboard() {
  const [tab, setTab] = useState<"available" | "mine" | "earnings">("available")
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const { data, mutate, isLoading } = useSWR("role-rider-orders", getRiderOrders)
  const { data: earnings, isLoading: earningsLoading } = useSWR("role-rider-earnings", getRiderEarnings)
  const orders: any[] = data?.data ?? []
  const available = orders.filter((order) => order.status === "confirmed" && !order.rider_id)
  const mine = orders.filter((order) => Boolean(order.rider_id))
  const earningsRows: any[] = earnings?.data as any[] ?? []
  const today = new Date().toISOString().slice(0, 10)
  const todayEarnings = earningsRows.find((row) => row.day === today)
  const trackableOrders = mine.filter((order) => ["assigned", "picked_up"].includes(order.status))
  const locationSharing = useRiderLocationSharing(trackableOrders, { isLoading, hasError: Boolean(data?.error) })

  async function run(id: string, action: () => Promise<{ error: string | null }>) {
    setBusy(id)
    setActionError(null)
    const result = await action()
    if (result.error) setActionError(result.error)
    await mutate()
    setBusy(null)
  }

  const visibleOrders = tab === "available" ? available : mine

  return (
    <div className="pb-8">
      <ScreenHeader title="Rider dashboard" subtitle="Deliver orders and track earnings" />
      <MetricRow>
        <Metric label="Available orders" value={String(available.length)} />
        <Metric label="My active deliveries" value={String(mine.filter((order) => ["assigned", "picked_up"].includes(order.status)).length)} />
        <Metric label="Today&apos;s deliveries" value={String(todayEarnings?.deliveries ?? 0)} />
        <Metric label="Today&apos;s earnings" value={formatNaira(todayEarnings?.earnings ?? 0)} />
      </MetricRow>
      <div className="flex flex-col gap-4 px-5 pt-5">
        <div role="tablist" aria-label="Rider dashboard sections" className="flex gap-2 overflow-x-auto">
          {(["available", "mine", "earnings"] as const).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${tab === item ? "bg-brand text-brand-foreground" : "bg-secondary text-muted-foreground"}`}>
              {item === "mine" ? "My orders" : item}
            </button>
          ))}
        </div>
        <SafeMessage error={data?.error} />
        {actionError ? <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{actionError}</p> : null}
        {tab === "earnings" ? (
          earningsLoading ? <TableSkeleton columns={3} /> : earningsRows.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">No earnings yet.</p> : (
            <TableFrame minWidth="min-w-[540px]">
              <thead><tr className="border-b border-border bg-secondary/50"><th className={headerClass}>Day</th><th className={headerClass}>Deliveries</th><th className={headerClass}>Earnings</th></tr></thead>
              <tbody>{earningsRows.map((row) => <tr key={row.day} className="border-b border-border last:border-0"><td className={cellClass}>{row.day}</td><td className={cellClass}>{row.deliveries}</td><td className={`${cellClass} font-bold`}>{formatNaira(row.earnings)}</td></tr>)}</tbody>
            </TableFrame>
          )
        ) : isLoading ? <TableSkeleton columns={6} /> : visibleOrders.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">No orders yet.</p> : (
          <TableFrame minWidth="min-w-[1050px]">
            <thead><tr className="border-b border-border bg-secondary/50"><th className={headerClass}>Order</th><th className={headerClass}>Vendor</th><th className={headerClass}>Items</th><th className={headerClass}>Pickup</th><th className={headerClass}>Dropoff</th><th className={headerClass}>Total</th><th className={headerClass}>Status</th><th className={headerClass}>Actions</th></tr></thead>
            <tbody>{visibleOrders.map((order) => <RiderOrderRow key={order.id} order={order} busy={busy === order.id} isSharingLocation={locationSharing.sharingOrderId === order.id} isStartingLocation={locationSharing.isStarting && locationSharing.statusOrderId === order.id} locationStatus={locationSharing.statusOrderId === order.id ? locationSharing.statusMessage : null} locationStatusIsError={locationSharing.statusOrderId === order.id && locationSharing.statusIsError} lastLocationUpdate={locationSharing.sharingOrderId === order.id ? locationSharing.lastUpdatedAt : null} onToggleLocation={() => locationSharing.toggleSharing(order.id)} onAccept={() => run(order.id, () => acceptRiderOrder(order.id))} onDecline={() => run(order.id, () => declineRiderOrder(order.id))} onLock={() => run(order.id, () => updateRiderOrderStatus(order.id, "picked_up"))} onDeliver={() => run(order.id, () => updateRiderOrderStatus(order.id, "delivered"))} />)}</tbody>
          </TableFrame>
        )}
      </div>
    </div>
  )
}

function RiderOrderRow({ order, busy, isSharingLocation, isStartingLocation, locationStatus, locationStatusIsError, lastLocationUpdate, onToggleLocation, onAccept, onDecline, onLock, onDeliver }: { order: any; busy: boolean; isSharingLocation: boolean; isStartingLocation: boolean; locationStatus: string | null; locationStatusIsError: boolean; lastLocationUpdate: Date | null; onToggleLocation: () => void; onAccept: () => void; onDecline: () => void; onLock: () => void; onDeliver: () => void }) {
  const vendorName = Array.isArray(order.vendors) ? order.vendors[0]?.name : order.vendors?.name
  const canShareLocation = ["assigned", "picked_up"].includes(order.status) && Boolean(order.rider_id)
  const locationStatusText = locationStatus ?? (isSharingLocation
    ? lastLocationUpdate
      ? `Sharing location · Updated at ${lastLocationUpdate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
      : "Sharing location · Waiting for GPS…"
    : null)

  return (
    <tr className="border-b border-border last:border-0">
      <td className={`${cellClass} font-bold`}>{order.order_code}</td>
      <td className={cellClass}>{vendorName ?? "Vendor"}</td>
      <td className={`${cellClass} max-w-56 whitespace-normal text-muted-foreground`}><OrderItems items={order.order_items ?? []} /></td>
      <td className={`${cellClass} max-w-48 whitespace-normal`}>{order.pickup_location ?? vendorName ?? "Vendor"}</td>
      <td className={`${cellClass} max-w-48 whitespace-normal`}>{order.dropoff_location}</td>
      <td className={`${cellClass} font-bold`}>{formatNaira(order.total)}</td>
      <td className={`${cellClass} capitalize`}>{order.status.replace("_", " ")}</td>
      <td className={`${cellClass} min-w-64`}>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {order.status === "confirmed" && !order.rider_id ? <><PrimaryButton disabled={busy} onClick={onAccept} className="h-9 min-w-20 px-3 text-xs">Accept</PrimaryButton><button disabled={busy} onClick={onDecline} className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">Decline</button></> : null}
            {order.status === "assigned" ? <PrimaryButton disabled={busy} onClick={onLock} className="h-9 min-w-20 px-3 text-xs">Lock in</PrimaryButton> : null}
            {order.status === "picked_up" ? <PrimaryButton disabled={busy} onClick={onDeliver} className="h-9 min-w-28 px-3 text-xs">Mark delivered</PrimaryButton> : null}
          </div>
          {canShareLocation ? (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                role="switch"
                aria-checked={isSharingLocation}
                aria-label={`${isSharingLocation ? "Stop sharing location for" : "Share my location for"} order ${order.order_code}`}
                disabled={isStartingLocation}
                onClick={onToggleLocation}
                className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl px-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:cursor-wait disabled:opacity-60"
              >
                <span aria-hidden="true" className={`relative h-5 w-9 rounded-full transition-colors ${isSharingLocation ? "bg-brand" : "bg-muted-foreground/30"}`}>
                  <span className={`absolute top-0.5 size-4 rounded-full bg-background shadow-sm transition-transform ${isSharingLocation ? "translate-x-4" : "translate-x-0.5"}`} />
                </span>
                Share my location
              </button>
              {locationStatusText ? <p role={locationStatusIsError ? "alert" : "status"} aria-live="polite" className={`px-2 text-[11px] ${locationStatusIsError ? "text-destructive" : "text-muted-foreground"}`}>{locationStatusText}</p> : null}
            </div>
          ) : null}
        </div>
      </td>
    </tr>
  )
}

function AdminDashboard() {
  const { navigate } = useApp()
  const { data, mutate, isLoading } = useSWR("role-admin-data", getAdminData)
  const [busy, setBusy] = useState<string | null>(null)
  const orders: any[] = data?.data.orders ?? []
  const riders: any[] = data?.data.riders ?? []
  const today = new Date().toISOString().slice(0, 10)
  const deliveredToday = orders.filter((order) => order.status === "delivered" && order.created_at?.slice(0, 10) === today)
  const fees = deliveredToday.reduce((sum, order) => sum + (order.delivery_fee ?? 0), 0)

  async function save(id: string, status: string) {
    setBusy(id)
    await updateOrderStatus(id, status)
    await mutate()
    setBusy(null)
  }

  function orderControls(order: any) {
    return (
      <div className="flex min-w-[330px] gap-2">
        <select aria-label={`Update status for ${order.order_code}`} disabled={busy === order.id} value={order.status} onChange={(event) => save(order.id, event.target.value)} className="min-w-36 rounded-xl border border-border bg-background px-3 py-2 text-xs">
          {statuses.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
        </select>
        <select aria-label={`Assign rider for ${order.order_code}`} defaultValue="" onChange={(event) => event.target.value && assignRider(order.id, event.target.value).then(() => mutate())} className="min-w-40 rounded-xl border border-border bg-background px-3 py-2 text-xs">
          <option value="">Assign rider</option>
          {riders.map((rider: any) => <option key={rider.id} value={rider.id}>{rider.email}</option>)}
        </select>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <ScreenHeader title="Admin dashboard" subtitle="All orders and delivery performance" />
      <MetricRow>
        <Metric label="Total orders" value={String(orders.length)} onClick={() => navigate("adminOrders")} />
        <Metric label="Delivered today" value={String(deliveredToday.length)} />
        <Metric label="Delivery fees" value={formatNaira(fees)} />
        <Metric label="Company share" value={formatNaira(fees * 0.3)} />
      </MetricRow>
      <div className="flex flex-col gap-4 px-5 pt-5">
        <SafeMessage error={data?.error} />
        {isLoading ? <TableSkeleton columns={6} /> : null}
        {!isLoading && !data?.error && orders.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">No orders yet.</p> : null}
        {!isLoading && orders.length > 0 ? (
          <TableFrame minWidth="min-w-[1050px]">
            <thead><tr className="border-b border-border bg-secondary/50"><th className={headerClass}>Order</th><th className={headerClass}>Customer</th><th className={headerClass}>Vendor</th><th className={headerClass}>Rider</th><th className={headerClass}>Total</th><th className={headerClass}>Status</th><th className={headerClass}>Manage</th></tr></thead>
            <tbody>{orders.map((order) => <tr key={order.id} className="border-b border-border last:border-0"><td className={`${cellClass} font-bold`}>{order.order_code}</td><td className={cellClass}>{order.customer_name}</td><td className={cellClass}>{order.vendors?.name ?? "No vendor"}</td><td className={cellClass}>{order.rider_id ?? "Unassigned"}</td><td className={`${cellClass} font-bold`}>{formatNaira(order.total)}</td><td className={`${cellClass} capitalize`}>{order.status.replace("_", " ")}</td><td className={cellClass}>{orderControls(order)}</td></tr>)}</tbody>
          </TableFrame>
        ) : null}
      </div>
    </div>
  )
}

export function RoleDashboardScreen({ role }: { role: Role }) {
  const { data, isLoading } = useSWR("current-profile", getCurrentProfile)
  if (isLoading) return <LoadingState label="Loading your dashboard..." className="min-h-48" />
  if (!data?.data || data.data.role !== role) return <p className="p-6 text-sm text-muted-foreground">You don&apos;t have access to this section.</p>
  if (role === "vendor") return <VendorDashboard />
  if (role === "rider") return <RiderDashboard />
  if (role === "admin") return <AdminDashboard />
  return <CustomerDashboard />
}
