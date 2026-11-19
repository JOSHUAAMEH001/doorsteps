"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import {
  BarChart3,
  Bike,
  CheckCircle2,
  Clock,
  History,
  Home,
  LogOut,
  MapPin,
  Navigation,
  Package,
  Phone,
  Power,
  Radio,
  Store,
  User,
  Wallet,
  XCircle,
} from "lucide-react"
import { getPreviewTargets, getRiderWorkspace, type RiderOrder, type RiderWorkspace } from "@/app/actions/dashboard"
import { acceptRiderOrder, declineRiderOrder, updateRiderOrderStatus } from "@/app/actions/roles"
import { useApp } from "@/lib/store"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { AdminPreviewBar, useSignOut } from "@/components/dashboard/shell"
import { useRiderLocationSharing } from "@/components/screens/use-rider-location-sharing"
import {
  ActionButton,
  AreaChart,
  Badge,
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  Panel,
  StatusBadge,
  Toasts,
  formatDateTime,
  lastDays,
  naira,
  timeAgo,
  todayKey,
  useNow,
  useToasts,
} from "@/components/dashboard/kit"

type Tab = "home" | "history" | "earnings" | "profile"

const EMPTY: RiderWorkspace = { riderId: null, riderName: null, orders: [], earnings: [] }
const ONLINE_KEY = "doors-rider-online"

/** Rider earning shown before delivery uses the same 70% rule as the database trigger. */
const expectedEarning = (o: RiderOrder) => Number(o.rider_earning) || Math.round((Number(o.delivery_fee) || 0) * 0.7)

function mapsLink(order: RiderOrder, leg: "pickup" | "dropoff") {
  if (leg === "dropoff" && order.dropoff_lat != null && order.dropoff_lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${order.dropoff_lat},${order.dropoff_lng}&travelmode=driving`
  }
  const place = leg === "pickup" ? [order.vendors?.name, order.pickup_location].filter(Boolean).join(", ") : order.dropoff_location
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place}, Agbani, Enugu`)}&travelmode=driving`
}

export function RiderDashboard({ preview = false }: { preview?: boolean }) {
  const [tab, setTab] = useState<Tab>("home")
  const [online, setOnline] = useState(true)
  const [previewId, setPreviewId] = useState("")
  const { data: targets } = useSWR(preview ? "dashboard-preview-targets" : null, getPreviewTargets)
  useEffect(() => {
    if (preview && !previewId && targets?.data.riders[0]) setPreviewId(targets.data.riders[0].id)
  }, [preview, previewId, targets])
  const { data, error, isLoading, mutate } = useSWR(
    preview ? (previewId ? ["dashboard-rider-preview", previewId] : null) : "dashboard-rider",
    () => getRiderWorkspace(preview ? previewId : undefined),
    { refreshInterval: 15_000, revalidateOnFocus: true },
  )
  const toasts = useToasts()
  const now = useNow(30_000)
  const workspace = data?.data ?? EMPTY
  const loadError = data?.error ?? (error ? "Could not load your deliveries." : null)

  const mine = workspace.orders.filter((o) => o.rider_id === workspace.riderId)
  const active = mine.filter((o) => o.status === "assigned" || o.status === "picked_up")
  const requests = workspace.orders.filter((o) => o.status === "confirmed" && !o.rider_id)
  const history = mine.filter((o) => o.status === "delivered" || o.status === "cancelled")
  const today = workspace.earnings.find((row) => row.day === todayKey())

  // In admin preview, never share the admin's own GPS: give the hook no orders to track.
  const location = useRiderLocationSharing(preview ? [] : active, { isLoading, hasError: Boolean(loadError) })

  // Remember the online switch per device.
  useEffect(() => {
    if (preview) return
    try { const saved = window.localStorage.getItem(ONLINE_KEY); if (saved !== null) setOnline(saved === "1") } catch { /* storage unavailable */ }
  }, [preview])
  function setOnlineState(next: boolean) {
    if (preview) return
    setOnline(next)
    try { window.localStorage.setItem(ONLINE_KEY, next ? "1" : "0") } catch { /* storage unavailable */ }
    if (!next && location.sharingOrderId) location.toggleSharing(location.sharingOrderId)
  }

  async function run(label: string, action: () => Promise<{ error: string | null }>) {
    if (preview) return false
    const result = await action()
    if (result.error) toasts.push(result.error, "error")
    else toasts.push(label)
    await mutate()
    return !result.error
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#f6f6f8]">
      <header className="sticky top-0 z-30 shrink-0 bg-brand text-white">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          <Image src="/brand/doors-mark-white.png" alt="DOORS" width={385} height={279} className="h-7 w-auto shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{workspace.riderName ?? "Rider"}</p>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/80">
              <span className={cn("size-2 rounded-full", online ? "bg-emerald-400" : "bg-white/40")} />
              {online ? "Online · receiving requests" : "Offline"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={online}
            aria-label={online ? "Go offline" : "Go online"}
            disabled={preview}
            onClick={() => setOnlineState(!online)}
            className={cn("flex h-11 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition-colors", online ? "bg-white text-brand" : "bg-white/15 text-white ring-1 ring-white/40")}
          >
            <Power aria-hidden="true" className="size-4" />
            {online ? "Online" : "Go online"}
          </button>
        </div>
      </header>

      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div key={tab} className="doors-fade-in mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4 pb-8">
          {preview ? <AdminPreviewBar kind="rider" options={targets?.data.riders ?? []} value={previewId} onChange={setPreviewId} /> : null}
          {loadError ? <ErrorBanner message={loadError} onRetry={() => void mutate()} /> : null}
          {preview && !previewId ? null : isLoading && !data ? <ListSkeleton rows={3} /> : (
            <>
              {tab === "home" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <MiniStat icon={Wallet} label="Earned today" value={naira(today?.earnings ?? 0)} />
                    <MiniStat icon={CheckCircle2} label="Done today" value={String(today?.deliveries ?? 0)} />
                  </div>
                  {active.length ? (
                    active.map((order) => <ActiveDelivery key={order.id} order={order} location={location} run={run} now={now} readOnly={preview} />)
                  ) : (
                    <Panel><EmptyState icon={Bike} title="No active delivery" body={online ? "Accept a request below to start a delivery." : "You're offline. Go online to see delivery requests."} /></Panel>
                  )}
                  <section aria-labelledby="requests-heading" className="flex flex-col gap-3">
                    <h2 id="requests-heading" className="flex items-center gap-2 px-1 text-sm font-extrabold text-foreground">
                      <Radio aria-hidden="true" className="size-4 text-brand" />Delivery requests
                      {online && requests.length ? <Badge tone="brand">{requests.length}</Badge> : null}
                    </h2>
                    {!online ? (
                      <Panel><EmptyState icon={Power} title="You're offline" body="Requests are hidden and location sharing is off." action={<ActionButton onClick={() => setOnlineState(true)}>Go online</ActionButton>} /></Panel>
                    ) : requests.length === 0 ? (
                      <Panel><EmptyState icon={Package} title="No requests right now" body="When a vendor accepts an order, it shows up here. This screen refreshes every 15 seconds." /></Panel>
                    ) : (
                      requests.map((order) => <RequestCard key={order.id} order={order} run={run} now={now} hasActive={active.length > 0} readOnly={preview} />)
                    )}
                  </section>
                </>
              ) : null}
              {tab === "history" ? <HistoryTab orders={history} /> : null}
              {tab === "earnings" ? <EarningsTab workspace={workspace} /> : null}
              {tab === "profile" ? <ProfileTab workspace={workspace} deliveredCount={history.filter((o) => o.status === "delivered").length} /> : null}
            </>
          )}
        </div>
      </main>

      <nav aria-label="Rider navigation" className="sticky bottom-0 z-30 shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full max-w-2xl">
          {([
            ["home", "Home", Home, active.length],
            ["history", "Deliveries", History, 0],
            ["earnings", "Earnings", Wallet, 0],
            ["profile", "Profile", User, 0],
          ] as const).map(([id, label, Icon, badge]) => (
            <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined} className={cn("relative flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors", tab === id ? "text-brand" : "text-muted-foreground")}>
              <Icon aria-hidden="true" className="size-[22px]" strokeWidth={tab === id ? 2.4 : 2} />
              {label}
              {badge ? <span className="absolute right-[calc(50%-20px)] top-2 size-2 rounded-full bg-brand" /> : null}
            </button>
          ))}
        </div>
      </nav>
      <Toasts toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </div>
  )
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon aria-hidden="true" className="size-5" /></span>
      <div className="min-w-0"><p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p><p className="truncate text-lg font-extrabold tabular-nums">{value}</p></div>
    </div>
  )
}

type Runner = (label: string, action: () => Promise<{ error: string | null }>) => Promise<boolean>
type LocationState = ReturnType<typeof useRiderLocationSharing>

/* ----------------------------------------------------------------------------
 * Active delivery: big, glanceable, one primary action at a time
 * ------------------------------------------------------------------------- */

function ActiveDelivery({ order, location, run, now, readOnly }: { order: RiderOrder; location: LocationState; run: Runner; now: number; readOnly: boolean }) {
  const [busy, setBusy] = useState(false)
  const pickedUp = order.status === "picked_up"
  const sharing = location.sharingOrderId === order.id
  const locationMessage = location.statusOrderId === order.id ? location.statusMessage : null
  const cashDue = order.payment_method === "cash" && order.payment_status !== "paid"

  async function advance() {
    const next = pickedUp ? "delivered" : "picked_up"
    const question = pickedUp ? `Confirm ${order.order_code} was handed to ${order.customer_name}?${cashDue ? `\n\nCollect ${naira(order.total)} cash.` : ""}` : `Confirm you've collected ${order.order_code} from ${order.vendors?.name ?? "the vendor"}?`
    if (!window.confirm(question)) return
    setBusy(true)
    await run(pickedUp ? `${order.order_code} delivered. Nice work!` : `${order.order_code} picked up. Head to the customer.`, () => updateRiderOrderStatus(order.id, next))
    setBusy(false)
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 bg-foreground px-5 py-3.5 text-white">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Active delivery</p>
          <p className="text-base font-extrabold">{order.order_code}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-white/60">You earn</p>
          <p className="text-base font-extrabold tabular-nums">{naira(expectedEarning(order))}</p>
        </div>
      </header>

      <ol className="grid grid-cols-3 gap-1 px-5 pt-4" aria-label="Delivery progress">
        {["Go to pickup", "Deliver", "Done"].map((step, index) => {
          const done = index < (pickedUp ? 1 : 0)
          const current = index === (pickedUp ? 1 : 0)
          return (
            <li key={step} className="flex flex-col gap-1.5" aria-current={current ? "step" : undefined}>
              <span className={cn("h-1.5 rounded-full", done ? "bg-emerald-500" : current ? "bg-brand" : "bg-secondary")} />
              <span className={cn("text-[11px] font-bold", current ? "text-foreground" : "text-muted-foreground")}>{step}</span>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-col gap-3 p-5">
        <Leg icon={Store} label="Pickup from" title={order.vendors?.name ?? "Vendor"} detail={order.pickup_location ?? undefined} active={!pickedUp} href={mapsLink(order, "pickup")} />
        <Leg icon={MapPin} label="Deliver to" title={order.dropoff_location} detail={order.dropoff_note ?? undefined} active={pickedUp} href={mapsLink(order, "dropoff")} />

        <div className="flex items-center gap-3 rounded-2xl bg-secondary/70 p-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-sm font-extrabold">{order.customer_name[0]?.toUpperCase()}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{order.customer_name}</p><p className="truncate text-xs text-muted-foreground">{order.order_items.map((i) => `${i.quantity}× ${i.item_name}`).join(", ") || "Package"}</p></div>
          <a href={`tel:${order.phone}`} aria-label={`Call ${order.customer_name}`} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"><Phone aria-hidden="true" className="size-5" /></a>
        </div>

        {cashDue ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">Collect {naira(order.total)} cash on delivery</p> : null}

        <button
          type="button"
          role="switch"
          aria-checked={sharing}
          disabled={readOnly || location.isStarting}
          onClick={() => location.toggleSharing(order.id)}
          className={cn("flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-left transition-colors disabled:opacity-60", sharing ? "border-emerald-200 bg-emerald-50" : "border-border bg-background")}
        >
          <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", sharing ? "bg-emerald-500" : "bg-muted-foreground/30")}>
            <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-transform", sharing ? "translate-x-6" : "translate-x-1")} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{sharing ? "Sharing live location" : "Share live location"}</span>
            <span className={cn("block truncate text-[11px]", location.statusIsError && locationMessage ? "text-red-700" : "text-muted-foreground")} role="status" aria-live="polite">
              {locationMessage ?? (sharing ? (location.lastUpdatedAt ? `Customer can see you · updated ${timeAgo(location.lastUpdatedAt.toISOString(), now)}` : "Waiting for GPS…") : "Lets the customer and DOORS track this delivery")}
            </span>
          </span>
        </button>

        <ActionButton size="lg" onClick={() => void advance()} busy={busy} disabled={readOnly} className="w-full">
          {pickedUp ? <><CheckCircle2 aria-hidden="true" className="size-5" />Confirm delivery</> : <><Package aria-hidden="true" className="size-5" />Confirm pickup</>}
        </ActionButton>
        <p className="text-center text-[11px] text-muted-foreground">Accepted {timeAgo(order.created_at, now)} · {order.payment_method === "cash" ? "Cash" : order.payment_method} order · {naira(order.total)}</p>
      </div>
    </article>
  )
}

function Leg({ icon: Icon, label, title, detail, active, href }: { icon: typeof Store; label: string; title: string; detail?: string; active: boolean; href: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border p-3.5", active ? "border-brand/30 bg-brand-soft/50" : "border-border opacity-70")}>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", active ? "bg-brand text-white" : "bg-secondary text-muted-foreground")}><Icon aria-hidden="true" className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
        <p className="text-sm font-bold leading-snug text-foreground">{title}</p>
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Navigate: ${label} ${title}`} className={cn("flex h-12 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-extrabold", active ? "bg-brand text-white" : "bg-secondary text-foreground")}>
        <Navigation aria-hidden="true" className="size-4" />Navigate
      </a>
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * Requests
 * ------------------------------------------------------------------------- */

function RequestCard({ order, run, now, hasActive, readOnly }: { order: RiderOrder; run: Runner; now: number; hasActive: boolean; readOnly: boolean }) {
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null)
  async function act(kind: "accept" | "decline") {
    setBusy(kind)
    if (kind === "accept") await run(`${order.order_code} is yours. Head to ${order.vendors?.name ?? "the vendor"}.`, () => acceptRiderOrder(order.id))
    else await run(`${order.order_code} hidden from your requests.`, () => declineRiderOrder(order.id))
    setBusy(null)
  }
  return (
    <article className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold">{order.vendors?.name ?? "Vendor"} <span className="font-medium text-muted-foreground">· {order.order_code}</span></p>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />{order.dropoff_location}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Clock aria-hidden="true" className="size-3" />Ready {timeAgo(order.created_at, now)} · {order.order_items.reduce((a, i) => a + i.quantity, 0)} items</p>
        </div>
        <div className="shrink-0 text-right"><p className="text-[11px] text-muted-foreground">Earn</p><p className="text-lg font-extrabold tabular-nums text-emerald-700">{naira(expectedEarning(order))}</p></div>
      </div>
      {hasActive ? <p className="mt-3 text-[11px] font-semibold text-amber-700">You already have an active delivery. Only accept if you can carry both.</p> : null}
      <div className="mt-4 grid grid-cols-[1fr_2fr] gap-2">
        <ActionButton variant="danger" size="lg" onClick={() => void act("decline")} busy={busy === "decline"} disabled={readOnly || busy !== null}><XCircle aria-hidden="true" className="size-5" />Skip</ActionButton>
        <ActionButton size="lg" onClick={() => void act("accept")} busy={busy === "accept"} disabled={readOnly || busy !== null}><CheckCircle2 aria-hidden="true" className="size-5" />Accept</ActionButton>
      </div>
    </article>
  )
}

/* ----------------------------------------------------------------------------
 * History, earnings, profile
 * ------------------------------------------------------------------------- */

function HistoryTab({ orders }: { orders: RiderOrder[] }) {
  if (orders.length === 0) return <Panel><EmptyState icon={History} title="No deliveries yet" body="Completed deliveries will be listed here." /></Panel>
  return (
    <Panel bodyClassName="p-0">
      <ul>
        {orders.map((o) => (
          <li key={o.id} className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{o.order_code} <span className="font-medium text-muted-foreground">· {o.vendors?.name}</span></p>
              <p className="truncate text-xs text-muted-foreground">{o.dropoff_location}</p>
              <p className="text-[11px] text-muted-foreground">{formatDateTime(o.delivered_at ?? o.created_at)}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge status={o.status} audience="rider" />
              {o.status === "delivered" ? <span className="text-sm font-extrabold tabular-nums">{naira(o.rider_earning)}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function EarningsTab({ workspace }: { workspace: RiderWorkspace }) {
  const byDay = new Map(workspace.earnings.map((row) => [row.day, row]))
  const week = lastDays(7)
  const weekTotal = week.reduce((a, d) => a + (byDay.get(d.key)?.earnings ?? 0), 0)
  const allTime = workspace.earnings.reduce((a, r) => a + r.earnings, 0)
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <MiniStat icon={Wallet} label="Today" value={naira(byDay.get(todayKey())?.earnings ?? 0)} />
        <MiniStat icon={BarChart3} label="This week" value={naira(weekTotal)} />
        <MiniStat icon={CheckCircle2} label="Deliveries (60 days)" value={String(workspace.earnings.reduce((a, r) => a + r.deliveries, 0))} />
        <MiniStat icon={Wallet} label="Earned (60 days)" value={naira(allTime)} />
      </div>
      <Panel title="Last 7 days" icon={BarChart3}>
        <AreaChart points={week.map((d) => ({ label: d.label, value: byDay.get(d.key)?.earnings ?? 0 }))} format={(v) => naira(v, true)} label="Earnings per day" height={200} />
      </Panel>
      <Panel title="Daily breakdown" bodyClassName="p-0">
        {workspace.earnings.length === 0 ? <EmptyState icon={Wallet} title="No earnings yet" /> : (
          <ul>{workspace.earnings.map((row) => (
            <li key={row.day} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
              <span className="text-sm font-semibold">{new Date(`${row.day}T12:00:00`).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })}</span>
              <span className="text-xs text-muted-foreground">{row.deliveries} deliver{row.deliveries === 1 ? "y" : "ies"}</span>
              <span className="text-sm font-extrabold tabular-nums">{naira(row.earnings)}</span>
            </li>
          ))}</ul>
        )}
      </Panel>
      <p className="px-1 text-[11px] text-muted-foreground">You earn 70% of each delivery fee. Payouts are settled by DOORS.</p>
    </>
  )
}

function ProfileTab({ workspace, deliveredCount }: { workspace: RiderWorkspace; deliveredCount: number }) {
  const { navigate } = useApp()
  const { signOut, busy } = useSignOut()
  return (
    <>
      <Panel>
        <div className="flex items-center gap-4">
          <span className="flex size-16 items-center justify-center rounded-full bg-brand text-2xl font-extrabold text-white">{(workspace.riderName?.[0] ?? "R").toUpperCase()}</span>
          <div><p className="text-lg font-extrabold">{workspace.riderName ?? "Rider"}</p><p className="text-sm text-muted-foreground">DOORS rider · {deliveredCount} deliveries</p></div>
        </div>
      </Panel>
      <div className="flex flex-col gap-2">
        <ActionButton variant="secondary" size="lg" onClick={() => navigate("support")} className="w-full justify-start"><Phone aria-hidden="true" className="size-5" />Contact support</ActionButton>
        <ActionButton variant="secondary" size="lg" onClick={() => navigate("home")} className="w-full justify-start"><Store aria-hidden="true" className="size-5" />Open customer app</ActionButton>
        <ActionButton variant="danger" size="lg" onClick={() => void signOut()} busy={busy} className="w-full justify-start"><LogOut aria-hidden="true" className="size-5" />Log out</ActionButton>
      </div>
    </>
  )
}
