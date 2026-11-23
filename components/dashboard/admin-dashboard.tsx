"use client"

import dynamic from "next/dynamic"
import { useMemo, useState } from "react"
import useSWR from "swr"
import {
  BarChart3,
  Bike,
  ClipboardList,
  CreditCard,
  FileClock,
  Headphones,
  LayoutDashboard,
  MapPinned,
  Receipt,
  Rocket,
  Settings,
  ShoppingBag,
  SquarePen,
  Store,
  Timer,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react"
import {
  adminAssignRider,
  adminUpdateOrderStatus,
  getAdminWorkspace,
  type AdminOrder,
  type AdminPerson,
  type AdminWorkspace,
} from "@/app/actions/dashboard"
import { createClient } from "@/lib/supabase/client"
import { ACTIVE_DELIVERY, ADMIN_TRANSITIONS, IN_PROGRESS, STATUS_META, type OrderStatus } from "@/lib/order-status"
import { useApp } from "@/lib/store"
import { DashboardShell, type NavItem, type ShellNotice } from "@/components/dashboard/shell"
import { RecruitmentSection } from "@/components/dashboard/recruitment-section"
import { StoreEditor } from "@/components/dashboard/store-editor"
import {
  AreaChart,
  Badge,
  BarList,
  DashboardSkeleton,
  EmptyState,
  ErrorBanner,
  FilterTabs,
  NeedsSetup,
  Panel,
  PaymentBadge,
  SearchInput,
  StatCard,
  StatGrid,
  StatusBadge,
  Toasts,
  formatDateTime,
  lagosDateKey,
  lastDays,
  naira,
  timeAgo,
  todayKey,
  useNow,
  useToasts,
} from "@/components/dashboard/kit"
import type { FleetMarker } from "@/components/dashboard/fleet-map"

const FleetMap = dynamic(() => import("@/components/dashboard/fleet-map"), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse rounded-xl bg-secondary" />,
})

type Section = "overview" | "orders" | "deliveries" | "riders" | "vendors" | "store" | "customers" | "payments" | "reports" | "signups" | "support" | "audit" | "settings"

/** A rider counts as "live" if their phone shared a location in the last 2 minutes. */
const LIVE_WINDOW_MS = 2 * 60_000

const EMPTY: AdminWorkspace = { orders: [], people: [], locations: [], vendors: [], declines: [] }

export function AdminDashboard() {
  const { userName } = useApp()
  const [section, setSection] = useState<Section>("overview")
  const [orderFilter, setOrderFilter] = useState<OrderStatus | "all" | "unassigned">("all")
  const { data, error, isLoading, mutate } = useSWR("dashboard-admin", getAdminWorkspace, { refreshInterval: 20_000, revalidateOnFocus: true })
  const toasts = useToasts()
  const now = useNow(30_000)
  const workspace = data?.data ?? EMPTY
  const loadError = data?.error ?? (error ? "Could not load dashboard data." : null)

  const derived = useMemo(() => derive(workspace, now), [workspace, now])

  async function changeStatus(order: AdminOrder, next: OrderStatus) {
    if (next === "cancelled" && !window.confirm(`Cancel order ${order.order_code}? The customer and vendor will see it as cancelled.`)) return false
    const result = await adminUpdateOrderStatus(order.id, next)
    if (result.error) toasts.push(result.error, "error")
    else toasts.push(`${order.order_code} → ${STATUS_META[next].label}`)
    await mutate()
    return !result.error
  }

  async function assign(order: AdminOrder, riderId: string) {
    const result = await adminAssignRider(order.id, riderId)
    if (result.error) toasts.push(result.error, "error")
    else toasts.push(`${derived.nameOf(riderId)} ${order.rider_id ? "now handles" : "assigned to"} ${order.order_code}`)
    await mutate()
  }

  const nav: NavItem<Section>[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ClipboardList, badge: derived.pending.length + derived.unassigned.length, group: "Operations" },
    { id: "deliveries", label: "Deliveries & tracking", icon: MapPinned, badge: derived.active.length, group: "Operations" },
    { id: "riders", label: "Riders", icon: Bike, group: "Operations" },
    { id: "vendors", label: "Vendors", icon: Store, group: "Network" },
    { id: "store", label: "Store editor", icon: SquarePen, group: "Network" },
    { id: "customers", label: "Customers", icon: Users, group: "Network" },
    { id: "payments", label: "Payments", icon: CreditCard, group: "Finance" },
    { id: "reports", label: "Reports & analytics", icon: BarChart3, group: "Finance" },
    { id: "signups", label: "Pre-launch sign-ups", icon: Rocket, group: "Admin" },
    { id: "support", label: "Support & complaints", icon: Headphones, group: "Admin" },
    { id: "audit", label: "Audit log", icon: FileClock, group: "Admin" },
    { id: "settings", label: "Settings", icon: Settings, group: "Admin" },
  ]

  const notices: ShellNotice[] = [
    ...derived.unassigned.map((order) => ({ id: `u-${order.id}`, title: `${order.order_code} needs a rider`, body: `${order.vendors?.name ?? "Vendor"} accepted · ${order.dropoff_location}`, time: timeAgo(order.created_at, now), onOpen: () => { setOrderFilter("unassigned"); setSection("orders") } })),
    ...derived.pending.map((order) => ({ id: `p-${order.id}`, title: `${order.order_code} waiting on vendor`, body: `${order.vendors?.name ?? "Vendor"} · ${naira(order.total)}`, time: timeAgo(order.created_at, now), onOpen: () => { setOrderFilter("pending"); setSection("orders") } })),
  ]

  const titles: Record<Section, [string, string]> = {
    overview: [`Welcome back, ${userName.split(" ")[0]}`, "Here's what's happening on DOORS today."],
    orders: ["Orders", "Search, filter and manage every order."],
    deliveries: ["Deliveries & tracking", "Live rider positions and active deliveries."],
    riders: ["Riders", "Availability, workload and earnings."],
    vendors: ["Vendors", "Stores on the platform and their performance."],
    store: ["Store editor", "Edit what customers see: store names, banners and products, with a live preview."],
    customers: ["Customers", "Everyone who has ordered on DOORS."],
    payments: ["Payments", "Payment method, status and references for each order."],
    reports: ["Reports & analytics", "Trends from real order data."],
    signups: ["Pre-launch sign-ups", "Waitlist, vendor and rider applications from /join."],
    support: ["Support & complaints", "Customer issues and resolutions."],
    audit: ["Audit log", "Who changed what, and when."],
    settings: ["Settings", "Platform configuration."],
  }

  return (
    <DashboardShell roleLabel="Admin" title={titles[section][0]} subtitle={titles[section][1]} nav={nav} active={section} onSelect={setSection} notices={notices} userName={userName} showRolePreviews>
      {loadError ? <div className="mb-5"><ErrorBanner message={loadError} onRetry={() => void mutate()} /></div> : null}
      {isLoading && !data ? <DashboardSkeleton /> : (
        <>
          {section === "overview" ? <Overview d={derived} now={now} go={setSection} openOrders={(filter) => { setOrderFilter(filter); setSection("orders") }} /> : null}
          {section === "orders" ? <OrdersSection d={derived} filter={orderFilter} setFilter={setOrderFilter} onStatus={changeStatus} onAssign={assign} now={now} /> : null}
          {section === "deliveries" ? <DeliveriesSection d={derived} now={now} onAssign={assign} /> : null}
          {section === "riders" ? <RidersSection d={derived} now={now} /> : null}
          {section === "vendors" ? <VendorsSection d={derived} workspace={workspace} /> : null}
          {section === "store" ? <StoreEditor notify={(text, tone) => toasts.push(text, tone)} /> : null}
          {section === "customers" ? <CustomersSection d={derived} now={now} /> : null}
          {section === "payments" ? <PaymentsSection d={derived} /> : null}
          {section === "reports" ? <ReportsSection d={derived} /> : null}
          {section === "signups" ? <RecruitmentSection notify={(text, tone) => toasts.push(text, tone)} /> : null}
          {section === "support" ? <NeedsSetup audience="admin" title="Support tickets aren't stored yet" body="Customers currently reach support outside the app. Once the support_tickets table exists, complaints will appear here with status, assignee and the linked order." items={["Open / in progress / resolved queue", "Link each complaint to an order, customer, vendor or rider", "Admin replies and resolution notes"]} /> : null}
          {section === "audit" ? <NeedsSetup audience="admin" title="Audit logging isn't enabled yet" body="The migration adds an audit_logs table and a trigger on orders so every status change and rider assignment is recorded automatically, including who made it. Records are read-only, even for admins." items={["Order status changes with old → new values", "Rider assignments and reassignments", "Actor, role and timestamp for every change"]} /> : null}
          {section === "settings" ? <SettingsSection /> : null}
        </>
      )}
      <Toasts toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </DashboardShell>
  )
}

/* ----------------------------------------------------------------------------
 * Derived data
 * ------------------------------------------------------------------------- */

type Derived = ReturnType<typeof derive>

function derive(w: AdminWorkspace, now: number) {
  const people = new Map(w.people.map((p) => [p.id, p]))
  const nameOf = (id: string | null | undefined) => {
    if (!id) return "Unassigned"
    const person = people.get(id)
    return person?.full_name?.trim() || person?.email?.split("@")[0] || "Unknown rider"
  }
  const today = todayKey()
  const live = w.orders.filter((o) => o.status !== "cancelled")
  const delivered = w.orders.filter((o) => o.status === "delivered")
  const todayOrders = w.orders.filter((o) => lagosDateKey(o.created_at) === today)
  const deliveredToday = delivered.filter((o) => o.delivered_at && lagosDateKey(o.delivered_at) === today)
  const pending = w.orders.filter((o) => o.status === "pending")
  const unassigned = w.orders.filter((o) => o.status === "confirmed" && !o.rider_id)
  const active = w.orders.filter((o) => ACTIVE_DELIVERY.includes(o.status))
  const riders = w.people.filter((p) => p.role === "rider")
  const customers = w.people.filter((p) => p.role === "customer")
  const locationByRider = new Map(w.locations.map((l) => [l.rider_id, l]))
  const isLive = (riderId: string) => {
    const loc = locationByRider.get(riderId)
    return Boolean(loc && now - new Date(loc.updated_at).getTime() < LIVE_WINDOW_MS)
  }
  const sum = (orders: AdminOrder[], key: "total" | "delivery_fee" | "rider_earning" = "total") => orders.reduce((acc, o) => acc + (Number(o[key]) || 0), 0)
  const deliveryMinutes = delivered
    .filter((o) => o.delivered_at)
    .map((o) => (new Date(o.delivered_at!).getTime() - new Date(o.created_at).getTime()) / 60_000)
    .filter((m) => m > 0 && m < 24 * 60)
  const avgDelivery = deliveryMinutes.length ? Math.round(deliveryMinutes.reduce((a, b) => a + b, 0) / deliveryMinutes.length) : null
  const platformFees = sum(delivered, "delivery_fee") - sum(delivered, "rider_earning")

  return { w, people, nameOf, today, live, delivered, todayOrders, deliveredToday, pending, unassigned, active, riders, customers, locationByRider, isLive, sum, avgDelivery, platformFees }
}

/* ----------------------------------------------------------------------------
 * Overview
 * ------------------------------------------------------------------------- */

function Overview({ d, now, go, openOrders }: { d: Derived; now: number; go: (s: Section) => void; openOrders: (filter: OrderStatus | "all" | "unassigned") => void }) {
  const [range, setRange] = useState<7 | 14 | 30>(7)
  const days = lastDays(range)
  const byDay = new Map<string, number>()
  for (const order of d.live) byDay.set(lagosDateKey(order.created_at), (byDay.get(lagosDateKey(order.created_at)) ?? 0) + (Number(order.total) || 0))
  const points = days.map((day) => ({ label: range === 7 ? day.label : day.key.slice(8), value: byDay.get(day.key) ?? 0 }))
  const liveRiders = d.riders.filter((r) => d.isLive(r.id)).length

  return (
    <div className="flex flex-col gap-5">
      <StatGrid>
        <StatCard label="Total orders" value={d.w.orders.length.toLocaleString()} hint={`${d.todayOrders.length} today`} icon={ShoppingBag} onClick={() => openOrders("all")} />
        <StatCard label="Delivered revenue" value={naira(d.sum(d.delivered), true)} hint={`${naira(d.sum(d.deliveredToday))} today`} icon={Wallet} tone="success" onClick={() => go("payments")} />
        <StatCard label="Pending orders" value={String(d.pending.length + d.unassigned.length)} hint={`${d.pending.length} awaiting vendor · ${d.unassigned.length} need rider`} icon={Timer} tone="warning" onClick={() => openOrders(d.unassigned.length ? "unassigned" : "pending")} />
        <StatCard label="Active deliveries" value={String(d.active.length)} hint={`${liveRiders} of ${d.riders.length} riders live`} icon={Truck} tone="dark" onClick={() => go("deliveries")} />
      </StatGrid>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Panel
          title="Sales overview"
          icon={TrendingUp}
          action={
            <select aria-label="Chart range" value={range} onChange={(e) => setRange(Number(e.target.value) as 7 | 14 | 30)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold">
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          }
        >
          <p className="mb-3 text-xs text-muted-foreground">Order value placed per day (excludes cancelled orders), Lagos time.</p>
          <AreaChart points={points} format={(v) => naira(v, true)} label="Order value per day" />
        </Panel>
        <Panel title="Live delivery map" icon={MapPinned} action={<button type="button" onClick={() => go("deliveries")} className="text-xs font-bold text-brand hover:underline">View all →</button>} bodyClassName="p-3">
          <FleetMap markers={fleetMarkers(d, now)} className="h-[300px] w-full overflow-hidden rounded-xl bg-secondary" />
          {d.w.locations.length === 0 ? <p className="px-2 pt-3 text-xs text-muted-foreground">No rider is sharing a location right now. Riders appear here when they turn on location sharing during a delivery.</p> : null}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Panel title="Recent orders" icon={Receipt} action={<button type="button" onClick={() => openOrders("all")} className="text-xs font-bold text-brand hover:underline">View all →</button>} bodyClassName="p-0">
          {d.w.orders.length === 0 ? <EmptyState title="No orders yet" body="Orders appear here as soon as customers check out." /> : (
            <ul>
              {d.w.orders.slice(0, 6).map((order) => (
                <li key={order.id} className="flex items-center gap-4 border-b border-border px-5 py-3.5 last:border-0">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><ShoppingBag aria-hidden="true" className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{order.order_code}<span className="font-medium text-muted-foreground"> · {order.vendors?.name ?? "No vendor"}</span></p>
                    <p className="truncate text-xs text-muted-foreground">{order.customer_name} · {naira(order.total)}</p>
                  </div>
                  <StatusBadge status={order.status} />
                  <span className="hidden w-16 shrink-0 text-right text-[11px] text-muted-foreground sm:block">{timeAgo(order.created_at, now)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Today at a glance" icon={LayoutDashboard}>
          <dl className="grid grid-cols-2 gap-4">
            <Glance label="Orders today" value={String(d.todayOrders.length)} />
            <Glance label="Delivered today" value={String(d.deliveredToday.length)} />
            <Glance label="Platform fees (all time)" value={naira(d.platformFees)} hint="Delivery fees minus rider share" />
            <Glance label="Avg. delivery time" value={d.avgDelivery === null ? "—" : `${d.avgDelivery} min`} hint="Order placed → delivered" />
            <Glance label="Customers" value={String(d.customers.length)} />
            <Glance label="Active vendors" value={String(d.w.vendors.filter((v) => v.is_active).length)} />
          </dl>
        </Panel>
      </div>
    </div>
  )
}

function Glance({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-secondary/70 p-3.5">
      <dt className="text-[11px] font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-extrabold tabular-nums text-foreground">{value}</dd>
      {hint ? <dd className="text-[10px] text-muted-foreground">{hint}</dd> : null}
    </div>
  )
}

function fleetMarkers(d: Derived, now: number): FleetMarker[] {
  return d.w.locations.map((loc) => {
    const job = d.active.find((o) => o.rider_id === loc.rider_id)
    return {
      id: loc.rider_id,
      lat: loc.lat,
      lng: loc.lng,
      title: d.nameOf(loc.rider_id),
      subtitle: `${job ? `${job.order_code} · ${STATUS_META[job.status].label}` : "No active order"} · updated ${timeAgo(loc.updated_at, now)}`,
      stale: now - new Date(loc.updated_at).getTime() > LIVE_WINDOW_MS,
    }
  })
}

/* ----------------------------------------------------------------------------
 * Orders
 * ------------------------------------------------------------------------- */

function OrdersSection({ d, filter, setFilter, onStatus, onAssign, now }: { d: Derived; filter: OrderStatus | "all" | "unassigned"; setFilter: (f: OrderStatus | "all" | "unassigned") => void; onStatus: (o: AdminOrder, s: OrderStatus) => Promise<boolean>; onAssign: (o: AdminOrder, riderId: string) => Promise<void>; now: number }) {
  const [query, setQuery] = useState("")
  const [vendor, setVendor] = useState("all")
  const count = (s: OrderStatus) => d.w.orders.filter((o) => o.status === s).length
  const q = query.trim().toLowerCase()
  const rows = d.w.orders.filter((o) => {
    if (filter === "unassigned" ? !(o.status === "confirmed" && !o.rider_id) : filter !== "all" && o.status !== filter) return false
    if (vendor !== "all" && o.vendor_id !== vendor) return false
    if (!q) return true
    return [o.order_code, o.customer_name, o.phone, o.vendors?.name, o.dropoff_location, d.nameOf(o.rider_id)].some((v) => v?.toLowerCase().includes(q))
  })

  return (
    <div className="flex flex-col gap-4">
      <FilterTabs
        label="Filter orders by status"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All", count: d.w.orders.length },
          { value: "pending", label: "New", count: count("pending") },
          { value: "unassigned", label: "Needs rider", count: d.unassigned.length },
          { value: "assigned", label: "Rider assigned", count: count("assigned") },
          { value: "picked_up", label: "On delivery", count: count("picked_up") },
          { value: "delivered", label: "Delivered", count: count("delivered") },
          { value: "cancelled", label: "Cancelled", count: count("cancelled") },
        ]}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={query} onChange={setQuery} placeholder="Search order code, customer, phone, rider…" className="flex-1" />
        <select aria-label="Filter by vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm sm:w-56">
          <option value="all">All vendors</option>
          {d.w.vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <Panel bodyClassName="p-0">
        {rows.length === 0 ? <EmptyState title="No matching orders" body={q || vendor !== "all" || filter !== "all" ? "Try clearing the search or filters." : "Orders appear here as soon as customers check out."} /> : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-secondary/60 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Rider</th><th className="px-4 py-3">Change status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order) => (
                    <tr key={order.id} className="border-b border-border align-top last:border-0 hover:bg-secondary/30">
                      <td className="px-5 py-3.5"><p className="text-sm font-bold text-foreground">{order.order_code}</p><p className="text-[11px] text-muted-foreground">{timeAgo(order.created_at, now)}</p></td>
                      <td className="px-4 py-3.5"><p className="text-sm font-semibold text-foreground">{order.customer_name}</p><a href={`tel:${order.phone}`} className="text-[11px] text-muted-foreground hover:text-brand">{order.phone}</a><p className="max-w-[220px] truncate text-[11px] text-muted-foreground" title={order.dropoff_location}>{order.dropoff_location}</p></td>
                      <td className="px-4 py-3.5 text-sm text-foreground">{order.vendors?.name ?? "—"}</td>
                      <td className="px-4 py-3.5 text-sm font-bold tabular-nums text-foreground">{naira(order.total)}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3.5"><RiderPicker order={order} d={d} onAssign={onAssign} /></td>
                      <td className="px-4 py-3.5"><StatusPicker order={order} onStatus={onStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="lg:hidden">
              {rows.map((order) => (
                <li key={order.id} className="flex flex-col gap-3 border-b border-border p-4 last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">{order.order_code} <span className="font-medium text-muted-foreground">· {order.vendors?.name ?? "—"}</span></p>
                      <p className="truncate text-xs text-muted-foreground">{order.customer_name} · <a href={`tel:${order.phone}`} className="hover:text-brand">{order.phone}</a></p>
                      <p className="truncate text-xs text-muted-foreground">{order.dropoff_location}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1"><StatusBadge status={order.status} /><span className="text-sm font-bold tabular-nums">{naira(order.total)}</span></div>
                  </div>
                  <div className="grid gap-2 min-[420px]:grid-cols-2">
                    <RiderPicker order={order} d={d} onAssign={onAssign} />
                    <StatusPicker order={order} onStatus={onStatus} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
      <p className="text-[11px] text-muted-foreground">Showing {rows.length} of {d.w.orders.length} orders. Status changes follow the delivery workflow; moving an order back to &quot;Accepted&quot; releases its rider.</p>
    </div>
  )
}

function StatusPicker({ order, onStatus }: { order: AdminOrder; onStatus: (o: AdminOrder, s: OrderStatus) => Promise<boolean> }) {
  const [busy, setBusy] = useState(false)
  const options = ADMIN_TRANSITIONS[order.status] ?? []
  if (options.length === 0) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <select
      aria-label={`Change status of ${order.order_code}`}
      disabled={busy}
      value=""
      onChange={async (e) => {
        const next = e.target.value as OrderStatus
        if (!next) return
        setBusy(true)
        await onStatus(order, next)
        setBusy(false)
      }}
      className="h-10 w-full min-w-[150px] rounded-xl border border-border bg-background px-3 text-xs font-semibold disabled:opacity-50"
    >
      <option value="">{busy ? "Saving…" : "Move to…"}</option>
      {options.map((s) => <option key={s} value={s} disabled={["assigned", "picked_up", "delivered"].includes(s) && !order.rider_id}>{STATUS_META[s].label}</option>)}
    </select>
  )
}

function RiderPicker({ order, d, onAssign }: { order: AdminOrder; d: Derived; onAssign: (o: AdminOrder, riderId: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const assignable = IN_PROGRESS.includes(order.status)
  if (!assignable) return <span className="text-xs font-semibold text-foreground">{order.rider_id ? d.nameOf(order.rider_id) : <span className="text-muted-foreground">—</span>}</span>
  return (
    <select
      aria-label={`${order.rider_id ? "Reassign" : "Assign"} rider for ${order.order_code}`}
      disabled={busy || d.riders.length === 0}
      value={order.rider_id ?? ""}
      onChange={async (e) => {
        if (!e.target.value || e.target.value === order.rider_id) return
        setBusy(true)
        await onAssign(order, e.target.value)
        setBusy(false)
      }}
      className="h-10 w-full min-w-[160px] rounded-xl border border-border bg-background px-3 text-xs font-semibold disabled:opacity-50"
    >
      <option value="">{d.riders.length === 0 ? "No riders yet" : busy ? "Assigning…" : "Assign rider…"}</option>
      {d.riders.map((r) => {
        const load = d.active.filter((o) => o.rider_id === r.id).length
        return <option key={r.id} value={r.id}>{d.nameOf(r.id)}{d.isLive(r.id) ? " · live" : ""}{load ? ` · ${load} active` : ""}</option>
      })}
    </select>
  )
}

/* ----------------------------------------------------------------------------
 * Deliveries
 * ------------------------------------------------------------------------- */

function DeliveriesSection({ d, now, onAssign }: { d: Derived; now: number; onAssign: (o: AdminOrder, riderId: string) => Promise<void> }) {
  return (
    <div className="flex flex-col gap-5">
      <StatGrid>
        <StatCard label="Active deliveries" value={String(d.active.length)} icon={Truck} tone="dark" />
        <StatCard label="Waiting for a rider" value={String(d.unassigned.length)} icon={Timer} tone="warning" />
        <StatCard label="Riders sharing location" value={String(d.riders.filter((r) => d.isLive(r.id)).length)} hint="Updated in last 2 min" icon={MapPinned} />
        <StatCard label="Delivered today" value={String(d.deliveredToday.length)} icon={UserCheck} tone="success" />
      </StatGrid>
      <Panel title="Live map" icon={MapPinned} bodyClassName="p-3">
        <FleetMap markers={fleetMarkers(d, now)} className="h-[420px] w-full overflow-hidden rounded-xl bg-secondary" />
        <p className="px-2 pt-3 text-xs text-muted-foreground">Red pins are live. Grey pins haven&apos;t updated in over 2 minutes. Positions refresh every 20 seconds.</p>
      </Panel>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Waiting for a rider" icon={Timer} bodyClassName="p-0">
          {d.unassigned.length === 0 ? <EmptyState icon={UserCheck} title="Nothing waiting" body="Every accepted order has a rider." /> : (
            <ul>{d.unassigned.map((order) => (
              <li key={order.id} className="flex flex-col gap-3 border-b border-border p-4 last:border-0 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{order.order_code} <span className="font-medium text-muted-foreground">· {order.vendors?.name}</span></p>
                  <p className="truncate text-xs text-muted-foreground">To {order.dropoff_location} · waiting {timeAgo(order.created_at, now).replace(" ago", "")}</p>
                </div>
                <div className="sm:w-56"><RiderPicker order={order} d={d} onAssign={onAssign} /></div>
              </li>
            ))}</ul>
          )}
        </Panel>
        <Panel title="On the road" icon={Truck} bodyClassName="p-0">
          {d.active.length === 0 ? <EmptyState icon={Truck} title="No active deliveries" /> : (
            <ul>{d.active.map((order) => {
              const loc = order.rider_id ? d.locationByRider.get(order.rider_id) : undefined
              return (
                <li key={order.id} className="flex flex-col gap-2 border-b border-border p-4 last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold">{order.order_code} <span className="font-medium text-muted-foreground">· {d.nameOf(order.rider_id)}</span></p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{order.vendors?.name ?? "Vendor"} → {order.dropoff_location}</p>
                  <p className="text-[11px] text-muted-foreground">{loc ? `Location updated ${timeAgo(loc.updated_at, now)}` : "Rider isn't sharing location"}</p>
                  <div className="sm:w-56"><RiderPicker order={order} d={d} onAssign={onAssign} /></div>
                </li>
              )
            })}</ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * Riders, vendors, customers
 * ------------------------------------------------------------------------- */

function RidersSection({ d, now }: { d: Derived; now: number }) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const rows = d.riders
    .map((rider) => {
      const orders = d.w.orders.filter((o) => o.rider_id === rider.id)
      const delivered = orders.filter((o) => o.status === "delivered")
      return { rider, active: orders.filter((o) => ACTIVE_DELIVERY.includes(o.status)).length, delivered: delivered.length, earnings: d.sum(delivered, "rider_earning"), declines: d.w.declines.filter((x) => x.rider_id === rider.id).length, location: d.locationByRider.get(rider.id) }
    })
    .filter((row) => !q || [row.rider.full_name, row.rider.email].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) => b.active - a.active || b.delivered - a.delivered)

  return (
    <div className="flex flex-col gap-4">
      <StatGrid>
        <StatCard label="Riders" value={String(d.riders.length)} icon={Bike} />
        <StatCard label="Live now" value={String(d.riders.filter((r) => d.isLive(r.id)).length)} icon={MapPinned} tone="success" />
        <StatCard label="On a delivery" value={String(new Set(d.active.map((o) => o.rider_id)).size)} icon={Truck} tone="dark" />
        <StatCard label="Rider payouts earned" value={naira(d.sum(d.delivered, "rider_earning"))} hint="70% of delivery fees" icon={Wallet} tone="warning" />
      </StatGrid>
      <SearchInput value={query} onChange={setQuery} placeholder="Search riders…" className="sm:max-w-sm" />
      <Panel bodyClassName="p-0">
        {rows.length === 0 ? <EmptyState icon={Bike} title={d.riders.length ? "No matching riders" : "No riders yet"} body={d.riders.length ? undefined : "Riders are added through approved roles in Supabase."} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead><tr className="border-b border-border bg-secondary/60 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><th className="px-5 py-3">Rider</th><th className="px-4 py-3">Availability</th><th className="px-4 py-3">Active</th><th className="px-4 py-3">Delivered</th><th className="px-4 py-3">Earned</th><th className="px-4 py-3">Declines</th></tr></thead>
              <tbody>
                {rows.map(({ rider, active, delivered, earnings, declines, location }) => (
                  <tr key={rider.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5"><PersonCell person={rider} name={d.nameOf(rider.id)} /></td>
                    <td className="px-4 py-3.5">{d.isLive(rider.id) ? <Badge tone="success">Live</Badge> : <Badge>{location ? `Last seen ${timeAgo(location.updated_at, now)}` : "Offline"}</Badge>}</td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums">{active}</td>
                    <td className="px-4 py-3.5 text-sm tabular-nums">{delivered}</td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums">{naira(earnings)}</td>
                    <td className="px-4 py-3.5 text-sm tabular-nums text-muted-foreground">{declines}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="text-[11px] text-muted-foreground">&quot;Live&quot; means the rider&apos;s phone shared GPS in the last 2 minutes. A real online/offline shift status needs the profiles.is_online column from the migration.</p>
    </div>
  )
}

function PersonCell({ person, name }: { person: AdminPerson; name: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-extrabold text-brand">{(name[0] ?? "?").toUpperCase()}</span>
      <div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{name}</p><p className="truncate text-[11px] text-muted-foreground">{person.email}</p></div>
    </div>
  )
}

function VendorsSection({ d, workspace }: { d: Derived; workspace: AdminWorkspace }) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const rows = workspace.vendors
    .map((vendor) => {
      const orders = d.w.orders.filter((o) => o.vendor_id === vendor.id)
      const delivered = orders.filter((o) => o.status === "delivered")
      const decided = orders.filter((o) => o.status !== "pending")
      return { vendor, orders: orders.length, revenue: d.sum(delivered), pending: orders.filter((o) => o.status === "pending").length, rejectRate: decided.length ? Math.round((orders.filter((o) => o.status === "cancelled").length / decided.length) * 100) : null, staff: d.w.people.filter((p) => p.role === "vendor" && p.vendor_id === vendor.id).length }
    })
    .filter((row) => !q || row.vendor.name.toLowerCase().includes(q) || row.vendor.category.toLowerCase().includes(q))
    .sort((a, b) => b.orders - a.orders || a.vendor.name.localeCompare(b.vendor.name))

  return (
    <div className="flex flex-col gap-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search vendors or category…" className="sm:max-w-sm" />
      <Panel bodyClassName="p-0">
        {rows.length === 0 ? <EmptyState icon={Store} title="No vendors found" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead><tr className="border-b border-border bg-secondary/60 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><th className="px-5 py-3">Vendor</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Waiting</th><th className="px-4 py-3">Delivered revenue</th><th className="px-4 py-3">Reject rate</th><th className="px-4 py-3">Dashboard login</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.vendor.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5"><p className="text-sm font-bold">{row.vendor.name}</p><p className="text-[11px] text-muted-foreground">{row.vendor.category}{row.vendor.delivery_minutes ? ` · ~${row.vendor.delivery_minutes} min` : ""}</p></td>
                    <td className="px-4 py-3.5">{row.vendor.is_active ? <Badge tone="success">Active</Badge> : <Badge>Hidden</Badge>}</td>
                    <td className="px-4 py-3.5 text-sm tabular-nums">{row.orders}</td>
                    <td className="px-4 py-3.5 text-sm tabular-nums">{row.pending ? <Badge tone="warning">{row.pending}</Badge> : "0"}</td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums">{naira(row.revenue)}</td>
                    <td className="px-4 py-3.5 text-sm tabular-nums text-muted-foreground">{row.rejectRate === null ? "—" : `${row.rejectRate}%`}</td>
                    <td className="px-4 py-3.5">{row.staff ? <Badge tone="info">{row.staff} linked</Badge> : <span className="text-xs text-muted-foreground">Not set up</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <NeedsSetup audience="admin" title="Vendor approval and editing" body="Right now admins can only see active vendors, and vendors are added directly in Supabase. The migration adds an admin policy to view and manage every vendor, plus an approval status." items={["Approve or suspend vendors", "See hidden or pending vendors", "Edit store details and hours"]} />
    </div>
  )
}

function CustomersSection({ d, now }: { d: Derived; now: number }) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const rows = d.customers
    .map((customer) => {
      const orders = d.w.orders.filter((o) => o.user_id === customer.id)
      return { customer, orders: orders.length, spend: d.sum(orders.filter((o) => o.status === "delivered")), last: orders[0]?.created_at ?? null, phone: orders[0]?.phone ?? null }
    })
    .filter((row) => !q || [row.customer.full_name, row.customer.email, row.phone].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) => b.orders - a.orders)

  return (
    <div className="flex flex-col gap-4">
      <StatGrid>
        <StatCard label="Customers" value={String(d.customers.length)} icon={Users} />
        <StatCard label="Have ordered" value={String(rows.filter((r) => r.orders > 0).length)} icon={ShoppingBag} tone="success" />
        <StatCard label="Repeat customers" value={String(rows.filter((r) => r.orders > 1).length)} icon={UserCheck} tone="dark" />
        <StatCard label="Avg. order value" value={naira(d.live.length ? d.sum(d.live) / d.live.length : 0)} icon={Wallet} tone="warning" />
      </StatGrid>
      <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email or phone…" className="sm:max-w-sm" />
      <Panel bodyClassName="p-0">
        {rows.length === 0 ? <EmptyState icon={Users} title={d.customers.length ? "No matching customers" : "No customers yet"} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead><tr className="border-b border-border bg-secondary/60 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><th className="px-5 py-3">Customer</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Delivered spend</th><th className="px-4 py-3">Last order</th><th className="px-4 py-3">Joined</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.customer.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5"><PersonCell person={row.customer} name={row.customer.full_name?.trim() || row.customer.email?.split("@")[0] || "Customer"} /></td>
                    <td className="px-4 py-3.5 text-sm">{row.phone ? <a href={`tel:${row.phone}`} className="hover:text-brand">{row.phone}</a> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3.5 text-sm tabular-nums">{row.orders}</td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums">{naira(row.spend)}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{row.last ? timeAgo(row.last, now) : "Never"}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{formatDateTime(row.customer.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * Payments & reports
 * ------------------------------------------------------------------------- */

function PaymentsSection({ d }: { d: Derived }) {
  const [method, setMethod] = useState<"all" | "cash" | "transfer" | "card">("all")
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const rows = d.w.orders.filter((o) => (method === "all" || o.payment_method === method) && (!q || [o.order_code, o.customer_name, o.payment_reference].some((v) => v?.toLowerCase().includes(q))))
  const byMethod = (m: string) => d.delivered.filter((o) => o.payment_method === m)

  return (
    <div className="flex flex-col gap-4">
      <StatGrid>
        <StatCard label="Delivered revenue" value={naira(d.sum(d.delivered), true)} icon={Wallet} tone="success" />
        <StatCard label="Cash on delivery" value={naira(d.sum(byMethod("cash")), true)} hint={`${byMethod("cash").length} delivered orders`} icon={Receipt} />
        <StatCard label="Transfer & card" value={naira(d.sum(byMethod("transfer")) + d.sum(byMethod("card")), true)} hint={`${byMethod("transfer").length + byMethod("card").length} delivered orders`} icon={CreditCard} tone="dark" />
        <StatCard label="Platform fees" value={naira(d.platformFees)} hint="Delivery fees − rider share" icon={TrendingUp} tone="warning" />
      </StatGrid>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <FilterTabs label="Filter by payment method" value={method} onChange={setMethod} options={[{ value: "all", label: "All" }, { value: "cash", label: "Cash" }, { value: "transfer", label: "Transfer" }, { value: "card", label: "Card" }]} />
        <SearchInput value={query} onChange={setQuery} placeholder="Order code, customer or reference…" className="sm:ml-auto sm:w-72" />
      </div>
      <Panel bodyClassName="p-0">
        {rows.length === 0 ? <EmptyState icon={CreditCard} title="No transactions match" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead><tr className="border-b border-border bg-secondary/60 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><th className="px-5 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Delivery fee</th><th className="px-4 py-3">Order status</th><th className="px-4 py-3">Reference</th></tr></thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="border-b border-border align-top last:border-0">
                    <td className="px-5 py-3.5"><p className="text-sm font-bold">{o.order_code}</p><p className="text-[11px] text-muted-foreground">{formatDateTime(o.created_at)}</p></td>
                    <td className="px-4 py-3.5 text-sm">{o.customer_name}</td>
                    <td className="px-4 py-3.5"><PaymentBadge method={o.payment_method} status={o.payment_status} /></td>
                    <td className="px-4 py-3.5 text-sm font-bold tabular-nums">{naira(o.total)}</td>
                    <td className="px-4 py-3.5 text-sm tabular-nums text-muted-foreground">{naira(o.delivery_fee)}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">{o.payment_reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="text-[11px] text-muted-foreground">Cash orders stay &quot;unpaid&quot; in the system until a payment record is added. Marking cash as collected needs a rider/admin confirmation step (planned in the migration).</p>
    </div>
  )
}

function ReportsSection({ d }: { d: Derived }) {
  const days = lastDays(30)
  const counts = new Map<string, number>()
  for (const o of d.live) counts.set(lagosDateKey(o.created_at), (counts.get(lagosDateKey(o.created_at)) ?? 0) + 1)
  const vendorTotals = new Map<string, number>()
  for (const o of d.delivered) vendorTotals.set(o.vendors?.name ?? "No vendor", (vendorTotals.get(o.vendors?.name ?? "No vendor") ?? 0) + (Number(o.total) || 0))
  const topVendors = [...vendorTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }))
  const statusRows = (Object.keys(STATUS_META) as OrderStatus[]).map((s) => ({ label: STATUS_META[s].label, value: d.w.orders.filter((o) => o.status === s).length }))
  const decided = d.w.orders.filter((o) => o.status !== "pending")
  const cancelRate = decided.length ? Math.round((d.w.orders.filter((o) => o.status === "cancelled").length / decided.length) * 100) : null

  return (
    <div className="flex flex-col gap-5">
      <StatGrid>
        <StatCard label="Orders (30 days)" value={String(days.reduce((acc, day) => acc + (counts.get(day.key) ?? 0), 0))} icon={ShoppingBag} />
        <StatCard label="Completion rate" value={decided.length ? `${Math.round((d.delivered.length / decided.length) * 100)}%` : "—"} hint="Delivered ÷ decided orders" icon={UserCheck} tone="success" />
        <StatCard label="Cancellation rate" value={cancelRate === null ? "—" : `${cancelRate}%`} icon={Timer} tone="warning" />
        <StatCard label="Avg. delivery time" value={d.avgDelivery === null ? "—" : `${d.avgDelivery} min`} icon={Truck} tone="dark" />
      </StatGrid>
      <Panel title="Orders per day · last 30 days" icon={BarChart3}>
        <AreaChart points={days.map((day) => ({ label: day.key.slice(8), value: counts.get(day.key) ?? 0 }))} label="Orders per day" />
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Top vendors by delivered revenue" icon={Store}>
          {topVendors.length ? <BarList rows={topVendors} format={(v) => naira(v)} /> : <EmptyState icon={Store} title="No delivered orders yet" />}
        </Panel>
        <Panel title="Orders by status" icon={ClipboardList}>
          <BarList rows={statusRows} />
        </Panel>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * Settings (read-only until policies exist)
 * ------------------------------------------------------------------------- */

function SettingsSection() {
  const { data, error, isLoading } = useSWR("admin-ordering-status", async () => {
    const { data: rows, error: rpcError } = await createClient().rpc("ordering_status")
    if (rpcError) throw rpcError
    return (Array.isArray(rows) ? rows[0] : rows) as { orders_open: boolean; can_order: boolean; message: string } | null
  })
  return (
    <div className="flex flex-col gap-5">
      <Panel title="Ordering" icon={Settings}>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : error || !data ? <p className="text-sm text-muted-foreground">Couldn&apos;t read ordering status.</p> : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Public ordering is {data.orders_open ? "open" : "closed"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{data.orders_open ? "Any signed-in customer can place orders." : `Customers see: "${data.message}". Admins and tester emails can still order.`}</p>
            </div>
            <Badge tone={data.orders_open ? "success" : "warning"}>{data.orders_open ? "Open" : "Pre-launch"}</Badge>
          </div>
        )}
      </Panel>
      <NeedsSetup audience="admin" title="Editing settings from the dashboard" body="site_settings has RLS turned on but no policies, so nobody can change it from the app (which is safe). The migration adds an admin-only update policy so you can open/close ordering and manage tester emails here." items={["Open / close ordering", "Edit the closed message", "Manage tester emails"]} />
    </div>
  )
}
