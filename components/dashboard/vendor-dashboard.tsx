"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import {
  BarChart3,
  Bike,
  CheckCircle2,
  ChefHat,
  Clock,
  ClipboardList,
  Headphones,
  LayoutDashboard,
  MapPin,
  Phone,
  ShoppingBag,
  Star,
  Store,
  UtensilsCrossed,
  Wallet,
  XCircle,
} from "lucide-react"
import { getVendorWorkspace, vendorRespondToOrder, type VendorOrder, type VendorWorkspace } from "@/app/actions/dashboard"
import { useApp } from "@/lib/store"
import { CatalogImage } from "@/components/app/catalog-image"
import { DashboardShell, type NavItem, type ShellNotice } from "@/components/dashboard/shell"
import {
  ActionButton,
  AreaChart,
  Badge,
  BarList,
  DashboardSkeleton,
  EmptyState,
  ErrorBanner,
  FilterTabs,
  NeedsSetup,
  Panel,
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

type Section = "orders" | "overview" | "menu" | "earnings" | "store" | "reviews" | "support"
type Board = "new" | "preparing" | "pickup" | "done" | "cancelled"

const EMPTY: VendorWorkspace = { vendor: null, orders: [], menu: [] }

/** Vendor revenue is the food subtotal; delivery fees belong to DOORS and riders. */
const vendorAmount = (o: VendorOrder) => Number(o.subtotal ?? o.total) || 0

export function VendorDashboard() {
  const { userName } = useApp()
  const [section, setSection] = useState<Section>("orders")
  const [board, setBoard] = useState<Board>("new")
  const { data, error, isLoading, mutate } = useSWR("dashboard-vendor", getVendorWorkspace, { refreshInterval: 15_000, revalidateOnFocus: true })
  const toasts = useToasts()
  const now = useNow(30_000)
  const workspace = data?.data ?? EMPTY
  const loadError = data?.error ?? (error ? "Could not load your orders." : null)
  const orders = workspace.orders

  const groups = useMemo(() => ({
    new: orders.filter((o) => o.status === "pending"),
    preparing: orders.filter((o) => o.status === "confirmed"),
    pickup: orders.filter((o) => o.status === "assigned" || o.status === "picked_up"),
    done: orders.filter((o) => o.status === "delivered"),
    cancelled: orders.filter((o) => o.status === "cancelled"),
  }), [orders])

  // New-order alert: toast + tab title when a pending order appears that we haven't seen.
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    const ids = groups.new.map((o) => o.id)
    if (seen.current === null) {
      if (data) seen.current = new Set(ids)
      return
    }
    const fresh = groups.new.filter((o) => !seen.current!.has(o.id))
    fresh.forEach((o) => {
      seen.current!.add(o.id)
      toasts.push(`New order ${o.order_code} · ${naira(vendorAmount(o))}`)
    })
    if (fresh.length) {
      try { navigator.vibrate?.(200) } catch { /* not supported */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups.new, data])
  useEffect(() => {
    const base = "DOORS Vendor"
    document.title = groups.new.length ? `(${groups.new.length}) New order${groups.new.length > 1 ? "s" : ""} · ${base}` : base
    return () => { document.title = "Doorsteps Logistics — Campus Delivery at ESUT Agbani" }
  }, [groups.new.length])

  async function respond(order: VendorOrder, decision: "accept" | "reject") {
    if (decision === "reject" && !window.confirm(`Reject order ${order.order_code}? The customer will see it as cancelled.`)) return
    const result = await vendorRespondToOrder(order.id, decision)
    if (result.error) toasts.push(result.error, "error")
    else toasts.push(decision === "accept" ? `${order.order_code} accepted. Start preparing.` : `${order.order_code} rejected.`)
    await mutate()
  }

  const storeName = workspace.vendor?.name ?? "Your store"
  const nav: NavItem<Section>[] = [
    { id: "orders", label: "Orders", icon: ClipboardList, badge: groups.new.length },
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "menu", label: "Products & menu", icon: UtensilsCrossed, group: "Store" },
    { id: "store", label: "Store profile & hours", icon: Store, group: "Store" },
    { id: "earnings", label: "Sales & earnings", icon: Wallet, group: "Business" },
    { id: "reviews", label: "Reviews", icon: Star, group: "Business" },
    { id: "support", label: "Support", icon: Headphones, group: "Business" },
  ]
  const notices: ShellNotice[] = groups.new.map((o) => ({ id: o.id, title: `New order ${o.order_code}`, body: `${o.order_items.length} item${o.order_items.length === 1 ? "" : "s"} · ${naira(vendorAmount(o))}`, time: timeAgo(o.created_at, now), onOpen: () => { setBoard("new"); setSection("orders") } }))

  const titles: Record<Section, string> = { orders: storeName, overview: "Overview", menu: "Products & menu", store: "Store profile & hours", earnings: "Sales & earnings", reviews: "Reviews", support: "Support" }
  const subtitle = section === "orders" ? (groups.new.length ? `${groups.new.length} new order${groups.new.length > 1 ? "s" : ""} waiting for you` : "No new orders right now. We'll alert you when one arrives.") : storeName

  return (
    <DashboardShell
      roleLabel="Vendor"
      title={titles[section]}
      subtitle={subtitle}
      nav={nav}
      active={section}
      onSelect={setSection}
      notices={notices}
      userName={userName}
      headerExtra={workspace.vendor ? <span className="hidden md:inline-flex">{workspace.vendor.is_active ? <Badge tone="success">Listed</Badge> : <Badge>Hidden</Badge>}</span> : null}
    >
      {loadError ? <div className="mb-5"><ErrorBanner message={loadError} onRetry={() => void mutate()} /></div> : null}
      {isLoading && !data ? <DashboardSkeleton /> : (
        <>
          {section === "orders" ? <OrdersBoard groups={groups} board={board} setBoard={setBoard} onRespond={respond} now={now} /> : null}
          {section === "overview" ? <Overview orders={orders} groups={groups} go={(b) => { setBoard(b); setSection("orders") }} /> : null}
          {section === "menu" ? <MenuSection workspace={workspace} /> : null}
          {section === "earnings" ? <EarningsSection orders={orders} /> : null}
          {section === "store" ? <StoreSection workspace={workspace} /> : null}
          {section === "reviews" ? <NeedsSetup title="Customer reviews aren't collected yet" body="The store rating you see is set by DOORS. Once customers can rate delivered orders, their reviews and your average rating will show here." items={["Star rating and comment per delivered order", "Reply to reviews", "Rating trend over time"]} /> : null}
          {section === "support" ? <SupportSection /> : null}
        </>
      )}
      <Toasts toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </DashboardShell>
  )
}

/* ----------------------------------------------------------------------------
 * Orders board: the heart of the vendor experience
 * ------------------------------------------------------------------------- */

type Groups = Record<Board, VendorOrder[]>

function OrdersBoard({ groups, board, setBoard, onRespond, now }: { groups: Groups; board: Board; setBoard: (b: Board) => void; onRespond: (o: VendorOrder, d: "accept" | "reject") => Promise<void>; now: number }) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const list = groups[board].filter((o) => !q || [o.order_code, o.customer_name, o.phone, ...o.order_items.map((i) => i.item_name)].some((v) => v?.toLowerCase().includes(q)))
  const today = todayKey()
  const todaySales = [...groups.preparing, ...groups.pickup, ...groups.done].filter((o) => lagosDateKey(o.created_at) === today)

  return (
    <div className="flex flex-col gap-5">
      <StatGrid>
        <StatCard label="New orders" value={String(groups.new.length)} icon={ShoppingBag} tone="warning" onClick={() => setBoard("new")} />
        <StatCard label="Preparing" value={String(groups.preparing.length)} icon={ChefHat} onClick={() => setBoard("preparing")} />
        <StatCard label="With rider" value={String(groups.pickup.length)} icon={Bike} tone="dark" onClick={() => setBoard("pickup")} />
        <StatCard label="Today's sales" value={naira(todaySales.reduce((a, o) => a + vendorAmount(o), 0))} hint={`${todaySales.length} accepted today`} icon={Wallet} tone="success" />
      </StatGrid>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <FilterTabs
          label="Order stage"
          value={board}
          onChange={setBoard}
          options={[
            { value: "new", label: "New", count: groups.new.length },
            { value: "preparing", label: "Preparing", count: groups.preparing.length },
            { value: "pickup", label: "With rider", count: groups.pickup.length },
            { value: "done", label: "Delivered", count: groups.done.length },
            { value: "cancelled", label: "Cancelled", count: groups.cancelled.length },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search order, customer or item…" className="md:ml-auto md:w-72" />
      </div>

      {board === "preparing" && groups.preparing.length > 0 ? (
        <p className="rounded-xl bg-sky-50 px-4 py-3 text-xs font-medium text-sky-800">Accepted orders are visible to DOORS riders. Have the food packed. A rider will claim the order and come to you for pickup.</p>
      ) : null}

      {list.length === 0 ? (
        <Panel><EmptyState icon={board === "new" ? CheckCircle2 : ClipboardList} title={q ? "No matching orders" : board === "new" ? "You're all caught up" : `No ${board === "pickup" ? "orders with a rider" : board === "done" ? "delivered orders" : `${board} orders`}`} body={board === "new" && !q ? "New orders appear here automatically. This page refreshes every 15 seconds." : undefined} /></Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((order) => <VendorOrderCard key={order.id} order={order} onRespond={onRespond} now={now} />)}
        </div>
      )}
    </div>
  )
}

function VendorOrderCard({ order, onRespond, now }: { order: VendorOrder; onRespond: (o: VendorOrder, d: "accept" | "reject") => Promise<void>; now: number }) {
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null)
  const isNew = order.status === "pending"
  const itemCount = order.order_items.reduce((a, i) => a + i.quantity, 0)

  async function act(decision: "accept" | "reject") {
    setBusy(decision)
    await onRespond(order, decision)
    setBusy(null)
  }

  return (
    <article className={`flex flex-col rounded-2xl border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)] ${isNew ? "border-amber-300 ring-4 ring-amber-50" : "border-border"}`}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-base font-extrabold text-foreground">{order.order_code}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground"><Clock aria-hidden="true" className="size-3" />{timeAgo(order.created_at, now)} · {formatDateTime(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} audience="vendor" />
      </header>
      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        <ul className="flex flex-col gap-2">
          {order.order_items.map((item, index) => (
            <li key={`${item.item_name}-${index}`} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0"><span className="mr-2 inline-flex min-w-7 justify-center rounded-md bg-secondary px-1.5 py-0.5 text-xs font-extrabold tabular-nums">{item.quantity}×</span><span className="font-semibold text-foreground">{item.item_name}</span></span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{naira(item.unit_price * item.quantity)}</span>
            </li>
          ))}
          {order.order_items.length === 0 ? <li className="text-sm text-muted-foreground">{order.item_description || "No item details"}</li> : null}
        </ul>
        {order.item_description && order.order_items.length > 0 ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900"><span className="font-bold">Note:</span> {order.item_description}</p> : null}
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <p className="flex items-center gap-2"><Phone aria-hidden="true" className="size-3.5" /><span className="font-semibold text-foreground">{order.customer_name}</span>{!isNew ? <a href={`tel:${order.phone}`} className="font-semibold text-brand hover:underline">{order.phone}</a> : null}</p>
          <p className="flex items-start gap-2"><MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" /><span>{order.dropoff_location}</span></p>
          {order.status === "assigned" ? <p className="flex items-center gap-2 font-semibold text-brand"><Bike aria-hidden="true" className="size-3.5" />A rider has claimed this order and is heading to you.</p> : null}
          {order.status === "picked_up" ? <p className="flex items-center gap-2 font-semibold text-foreground"><Bike aria-hidden="true" className="size-3.5" />Picked up. On the way to the customer.</p> : null}
          {order.status === "confirmed" && !order.rider_id ? <p className="flex items-center gap-2"><Bike aria-hidden="true" className="size-3.5" />Waiting for a rider to claim it</p> : null}
        </div>
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
        <div>
          <p className="text-[11px] text-muted-foreground">{itemCount} item{itemCount === 1 ? "" : "s"} · {order.payment_method === "cash" ? "Cash on delivery" : order.payment_method}</p>
          <p className="text-lg font-extrabold tabular-nums text-foreground">{naira(vendorAmount(order))}</p>
        </div>
        {isNew ? (
          <div className="flex gap-2">
            <ActionButton variant="danger" onClick={() => void act("reject")} busy={busy === "reject"} disabled={busy !== null}><XCircle aria-hidden="true" className="size-4" />Reject</ActionButton>
            <ActionButton onClick={() => void act("accept")} busy={busy === "accept"} disabled={busy !== null}><CheckCircle2 aria-hidden="true" className="size-4" />Accept</ActionButton>
          </div>
        ) : null}
      </footer>
    </article>
  )
}

/* ----------------------------------------------------------------------------
 * Overview, earnings
 * ------------------------------------------------------------------------- */

function salesByDay(orders: VendorOrder[]) {
  const map = new Map<string, number>()
  for (const o of orders) {
    if (o.status === "cancelled" || o.status === "pending") continue
    const key = lagosDateKey(o.created_at)
    map.set(key, (map.get(key) ?? 0) + vendorAmount(o))
  }
  return map
}

function Overview({ orders, groups, go }: { orders: VendorOrder[]; groups: Groups; go: (b: Board) => void }) {
  const sales = salesByDay(orders)
  const days = lastDays(7)
  const itemTotals = new Map<string, number>()
  for (const o of orders) if (o.status !== "cancelled") for (const item of o.order_items) itemTotals.set(item.item_name, (itemTotals.get(item.item_name) ?? 0) + item.quantity)
  const topItems = [...itemTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }))
  const week = days.reduce((a, d) => a + (sales.get(d.key) ?? 0), 0)
  const decided = orders.filter((o) => o.status !== "pending")

  return (
    <div className="flex flex-col gap-5">
      <StatGrid>
        <StatCard label="Sales today" value={naira(sales.get(todayKey()) ?? 0)} icon={Wallet} tone="success" />
        <StatCard label="Sales this week" value={naira(week)} icon={BarChart3} />
        <StatCard label="Waiting for you" value={String(groups.new.length)} icon={ShoppingBag} tone="warning" onClick={() => go("new")} />
        <StatCard label="Acceptance rate" value={decided.length ? `${Math.round(((decided.length - groups.cancelled.length) / decided.length) * 100)}%` : "—"} icon={CheckCircle2} tone="dark" />
      </StatGrid>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Sales · last 7 days" icon={BarChart3}>
          <p className="mb-3 text-xs text-muted-foreground">Food value of accepted orders (excludes delivery fees and rejected orders).</p>
          <AreaChart points={days.map((d) => ({ label: d.label, value: sales.get(d.key) ?? 0 }))} format={(v) => naira(v, true)} label="Sales per day" />
        </Panel>
        <Panel title="Best sellers" icon={UtensilsCrossed}>
          {topItems.length ? <BarList rows={topItems} format={(v) => `${v} sold`} /> : <EmptyState icon={UtensilsCrossed} title="No sales yet" />}
        </Panel>
      </div>
    </div>
  )
}

function EarningsSection({ orders }: { orders: VendorOrder[] }) {
  const sales = salesByDay(orders)
  const days = lastDays(30)
  const delivered = orders.filter((o) => o.status === "delivered")
  const history = [...new Set(orders.filter((o) => o.status !== "cancelled" && o.status !== "pending").map((o) => lagosDateKey(o.created_at)))].sort().reverse()

  return (
    <div className="flex flex-col gap-5">
      <StatGrid>
        <StatCard label="Delivered sales (all time)" value={naira(delivered.reduce((a, o) => a + vendorAmount(o), 0))} icon={Wallet} tone="success" />
        <StatCard label="Last 30 days" value={naira(days.reduce((a, d) => a + (sales.get(d.key) ?? 0), 0))} icon={BarChart3} />
        <StatCard label="Delivered orders" value={String(delivered.length)} icon={CheckCircle2} tone="dark" />
        <StatCard label="Average order" value={naira(delivered.length ? delivered.reduce((a, o) => a + vendorAmount(o), 0) / delivered.length : 0)} icon={ShoppingBag} tone="warning" />
      </StatGrid>
      <Panel title="Sales · last 30 days" icon={BarChart3}>
        <AreaChart points={days.map((d) => ({ label: d.key.slice(8), value: sales.get(d.key) ?? 0 }))} format={(v) => naira(v, true)} label="Sales per day" />
      </Panel>
      <Panel title="Daily history" icon={Clock} bodyClassName="p-0">
        {history.length === 0 ? <EmptyState icon={Wallet} title="No sales yet" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left">
              <thead><tr className="border-b border-border bg-secondary/60 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><th className="px-5 py-3">Day</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Delivered</th><th className="px-4 py-3">Sales</th></tr></thead>
              <tbody>
                {history.map((day) => {
                  const dayOrders = orders.filter((o) => lagosDateKey(o.created_at) === day && o.status !== "cancelled" && o.status !== "pending")
                  return (
                    <tr key={day} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 text-sm font-semibold">{new Date(`${day}T12:00:00`).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })}</td>
                      <td className="px-4 py-3 text-sm tabular-nums">{dayOrders.length}</td>
                      <td className="px-4 py-3 text-sm tabular-nums">{dayOrders.filter((o) => o.status === "delivered").length}</td>
                      <td className="px-4 py-3 text-sm font-bold tabular-nums">{naira(sales.get(day) ?? 0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="text-[11px] text-muted-foreground">Payouts are settled by DOORS outside the app. Figures show the food value of your orders, before any commission.</p>
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * Menu, store, support
 * ------------------------------------------------------------------------- */

function MenuSection({ workspace }: { workspace: VendorWorkspace }) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const items = workspace.menu.filter((m) => !q || m.name.toLowerCase().includes(q) || m.category?.toLowerCase().includes(q))
  const byCategory = new Map<string, typeof items>()
  for (const item of items) byCategory.set(item.category || "Other", [...(byCategory.get(item.category || "Other") ?? []), item])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground"><span className="font-bold text-foreground">{workspace.menu.length}</span> items live on your menu</p>
        <SearchInput value={query} onChange={setQuery} placeholder="Search menu…" className="sm:w-72" />
      </div>
      {items.length === 0 ? <Panel><EmptyState icon={UtensilsCrossed} title={q ? "No matching items" : "No items on your menu yet"} body={q ? undefined : "Contact DOORS to add your products."} /></Panel> : (
        [...byCategory.entries()].map(([category, list]) => (
          <Panel key={category} title={`${category} · ${list.length}`} bodyClassName="p-0">
            <ul className="grid sm:grid-cols-2">
              {list.map((item) => (
                <li key={item.id} className="flex items-center gap-3 border-b border-border p-4 sm:odd:border-r">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    <CatalogImage name={item.name} imageUrl={item.image_url} sizes="56px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
                    {item.description ? <p className="truncate text-xs text-muted-foreground">{item.description}</p> : null}
                    <p className="mt-0.5 text-sm font-extrabold tabular-nums text-foreground">{naira(item.price)}</p>
                  </div>
                  <Badge tone={item.is_available ? "success" : "neutral"}>{item.is_available ? "Available" : "Sold out"}</Badge>
                </li>
              ))}
            </ul>
          </Panel>
        ))
      )}
      <NeedsSetup title="Editing your menu from here" body="Vendors can currently view their menu but not change it. Supabase has no policy that lets a vendor update their own menu_items. The migration adds one, limited to your own store, so you can manage items yourself." items={["Mark items sold out / available instantly", "Edit price, name, description and photo", "Add new products and grocery stock levels"]} />
    </div>
  )
}

function StoreSection({ workspace }: { workspace: VendorWorkspace }) {
  const v = workspace.vendor
  return (
    <div className="flex flex-col gap-5">
      <Panel title="Store profile" icon={Store}>
        {!v ? <EmptyState icon={Store} title="Store not found" body="Your account is linked to a store that isn't active. Contact DOORS support." /> : (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Store name" value={v.name} />
            <Field label="Category" value={v.category} />
            <Field label="Rating" value={v.rating ? `${Number(v.rating).toFixed(1)} ★` : "—"} />
            <Field label="Typical delivery" value={v.delivery_minutes ? `${v.delivery_minutes} min` : "—"} />
            <Field label="Listing" value={v.is_active ? "Visible to customers" : "Hidden"} />
            <Field label="On DOORS since" value={formatDateTime(v.created_at)} />
          </dl>
        )}
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <NeedsSetup title="Open / close your store" body="Today a store is either listed or hidden by DOORS. The migration adds an is_open switch you control, so customers see 'Closed' instead of the store disappearing." />
        <NeedsSetup title="Operating hours" body="Set opening hours per day. Customers will see when you open next, and ordering pauses automatically outside your hours." />
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/70 p-3.5">
      <dt className="text-[11px] font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-foreground">{value}</dd>
    </div>
  )
}

function SupportSection() {
  const { navigate } = useApp()
  return (
    <Panel title="Get help" icon={Headphones}>
      <p className="text-sm text-muted-foreground">Problem with an order, a rider, or your menu? Reach the DOORS team through the support page.</p>
      <div className="mt-4"><ActionButton onClick={() => navigate("support")}><Headphones aria-hidden="true" className="size-4" />Open support</ActionButton></div>
    </Panel>
  )
}

