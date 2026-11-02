"use client"

import useSWR from 'swr'
import { useMemo, useState } from 'react'
import { Check, ChevronDown, CircleX, Package, Truck } from 'lucide-react'
import { getAdminData, getCurrentProfile, getRiderEarnings, getRiderOrders, getVendorOrders, acceptRiderOrder, assignRider, updateOrderStatus, type Role } from '@/app/actions/roles'
import { formatNaira } from '@/lib/data'
import { PrimaryButton, ScreenHeader } from '@/components/app/ui'

const statuses = ['pending', 'confirmed', 'assigned', 'picked_up', 'delivered', 'cancelled'] as const

function SafeMessage({ error }: { error?: string | null }) {
  return error ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">Could not load. Please refresh.</p> : null
}

function Items({ items }: { items: any[] }) {
  return <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{items.map((item) => <li key={`${item.item_name}-${item.quantity}`}>{item.quantity}x {item.item_name} · {formatNaira(item.unit_price)}</li>)}</ul>
}

function OrderCard({ order, actions }: { order: any; actions?: React.ReactNode }) {
  return <article className="rounded-3xl border border-border bg-card p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-foreground">{order.order_code}</p><p className="mt-1 text-xs text-muted-foreground">{order.customer_name} · {order.phone}</p></div><span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold capitalize text-brand">{order.status.replace('_', ' ')}</span></div>
    <p className="mt-3 text-xs text-muted-foreground">Dropoff: {order.dropoff_location}</p><Items items={order.order_items ?? []}/><div className="mt-4 flex items-center justify-between"><span className="text-sm font-extrabold">{formatNaira(order.total)}</span>{actions}</div>
  </article>
}

function CustomerDashboard() {
  const { data, isLoading } = useSWR('role-customer-orders', getVendorOrders)
  const orders = data?.data ?? []
  return <div className="pb-8"><ScreenHeader title="My orders" subtitle="Your latest Doorsteps orders"/><div className="space-y-3 px-5 pt-5">{isLoading ? <p className="text-sm text-muted-foreground">Loading orders...</p> : null}<SafeMessage error={data?.error}/>{!isLoading && !data?.error && orders.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">You have no orders yet.</p> : null}{orders.map((order: any) => <OrderCard key={order.id} order={order}/>)}</div></div>
}

function VendorDashboard() {
  const { data, mutate } = useSWR('role-vendor-orders', getVendorOrders)
  const [busy, setBusy] = useState<string | null>(null)
  async function update(id: string, status: string) { setBusy(id); await updateOrderStatus(id, status); await mutate(); setBusy(null) }
  const orders = data?.data ?? []
  return <div className="pb-8"><ScreenHeader title="Vendor orders" subtitle="Manage orders for your shop"/><div className="space-y-3 px-5 pt-5"><SafeMessage error={data?.error}/>{orders.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">No orders yet.</p> : null}{orders.map((order: any) => <OrderCard key={order.id} order={order} actions={order.status === 'pending' ? <div className="flex gap-2"><button disabled={busy === order.id} onClick={() => update(order.id, 'confirmed')} className="rounded-xl bg-brand px-3 py-2 text-xs font-bold text-brand-foreground"><Check className="mr-1 inline h-3.5 w-3.5"/>Confirm</button><button disabled={busy === order.id} onClick={() => update(order.id, 'cancelled')} className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive"><CircleX className="mr-1 inline h-3.5 w-3.5"/>Cancel</button></div> : null}/>)}</div></div>
}

function RiderDashboard() {
  const [tab, setTab] = useState<'available' | 'mine' | 'earnings'>('available')
  const { data, mutate } = useSWR('role-rider-orders', getRiderOrders)
  const { data: earnings } = useSWR('role-rider-earnings', getRiderEarnings)
  const orders: any[] = data?.data ?? []
  const available = orders.filter((order) => order.status === 'confirmed' && !order.rider_id)
  const mine = orders.filter((order) => Boolean(order.rider_id))
  async function accept(id: string) { await acceptRiderOrder(id); await mutate() }
  async function advance(order: any) { const next = order.status === 'assigned' ? 'picked_up' : 'delivered'; await updateOrderStatus(order.id, next); await mutate() }
  return <div className="pb-8"><ScreenHeader title="Rider dashboard" subtitle="Deliver orders and track earnings"/><div className="flex gap-2 overflow-x-auto px-5 pt-4">{(['available','mine','earnings'] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${tab === item ? 'bg-brand text-brand-foreground' : 'bg-secondary text-muted-foreground'}`}>{item === 'mine' ? 'My orders' : item}</button>)}</div><div className="space-y-3 px-5 pt-5"><SafeMessage error={data?.error}/>{tab === 'earnings' ? <Earnings rows={earnings?.data as any[] ?? []}/> : (tab === 'available' ? available : mine).map((order) => <OrderCard key={order.id} order={order} actions={tab === 'available' ? <PrimaryButton onClick={() => accept(order.id)} className="h-9 px-3 text-xs">Accept order</PrimaryButton> : order.status === 'assigned' || order.status === 'picked_up' ? <PrimaryButton onClick={() => advance(order)} className="h-9 px-3 text-xs">{order.status === 'assigned' ? 'Mark picked up' : 'Mark delivered'}</PrimaryButton> : null}/>)}{tab !== 'earnings' && (tab === 'available' ? available : mine).length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">No orders yet.</p> : null}</div></div>
}

function Earnings({ rows }: { rows: any[] }) { const today = new Date().toISOString().slice(0, 10); const todayRow = rows.find((row) => row.day === today); return <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-secondary p-4"><p className="text-xs text-muted-foreground">Today&apos;s deliveries</p><p className="mt-1 text-2xl font-extrabold">{todayRow?.deliveries ?? 0}</p></div><div className="rounded-2xl bg-secondary p-4"><p className="text-xs text-muted-foreground">Today&apos;s earnings</p><p className="mt-1 text-2xl font-extrabold">{formatNaira(todayRow?.earnings ?? 0)}</p></div></div>{rows.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">No earnings yet.</p> : <div className="divide-y divide-border rounded-2xl border border-border">{rows.map((row) => <div key={row.day} className="flex justify-between p-3 text-sm"><span>{row.day}</span><span>{row.deliveries} deliveries · {formatNaira(row.earnings)}</span></div>)}</div>}</div> }

function AdminDashboard() { const { data, mutate } = useSWR('role-admin-data', getAdminData); const [busy, setBusy] = useState<string | null>(null); const orders: any[] = data?.data.orders ?? []; const riders: any[] = data?.data.riders ?? []; const deliveredToday = orders.filter((o) => o.status === 'delivered' && o.created_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)); const fees = deliveredToday.reduce((sum, o) => sum + (o.delivery_fee ?? 0), 0); async function save(id: string, status: string) { setBusy(id); await updateOrderStatus(id, status); await mutate(); setBusy(null) } return <div className="pb-8"><ScreenHeader title="Admin dashboard" subtitle="All orders and delivery performance"/><div className="grid grid-cols-2 gap-3 px-5 pt-5"><Metric label="Orders today" value={String(orders.filter((o) => o.created_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length)}/><Metric label="Delivered today" value={String(deliveredToday.length)}/><Metric label="Delivery fees" value={formatNaira(fees)}/><Metric label="Company share" value={formatNaira(fees * .3)}/></div><div className="space-y-3 px-5 pt-5"><SafeMessage error={data?.error}/>{orders.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">No orders yet.</p> : null}{orders.map((order) => <article key={order.id} className="rounded-3xl border border-border bg-card p-4"><div className="flex items-start justify-between"><div><p className="font-extrabold">{order.order_code}</p><p className="text-xs text-muted-foreground">{order.customer_name} · {order.vendors?.name ?? 'No vendor'} · {order.rider_id ?? 'Unassigned'}</p></div><span className="text-sm font-bold">{formatNaira(order.total)}</span></div><div className="mt-3 flex gap-2"><select disabled={busy === order.id} value={order.status} onChange={(event) => save(order.id, event.target.value)} className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs"><option value="">Status</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select><select onChange={(event) => event.target.value && assignRider(order.id, event.target.value).then(() => mutate())} className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs"><option value="">Assign rider</option>{riders.map((rider) => <option key={rider.id} value={rider.id}>{rider.email}</option>)}</select></div></article>)}</div></div> }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-secondary p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-extrabold">{value}</p></div> }

export function RoleDashboardScreen({ role }: { role: Role }) { const { data, isLoading } = useSWR('current-profile', getCurrentProfile); if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading your dashboard...</p>; if (!data?.data || data.data.role !== role) return <p className="p-6 text-sm text-muted-foreground">You don&apos;t have access to this section.</p>; if (role === 'vendor') return <VendorDashboard/>; if (role === 'rider') return <RiderDashboard/>; if (role === 'admin') return <AdminDashboard/>; return <CustomerDashboard/> }
