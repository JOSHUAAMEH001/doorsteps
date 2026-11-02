"use client"

import useSWR from "swr"
import { CalendarDays } from "lucide-react"
import { getAdminOrders, getCurrentProfile } from "@/app/actions/roles"
import { formatNaira } from "@/lib/data"
import { useApp } from "@/lib/store"
import { ScreenHeader } from "@/components/app/ui"

const lagosMonth = new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric", timeZone: "Africa/Lagos" })
const lagosDate = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" })

type AdminOrder = {
  id: string
  order_code: string
  customer_name: string | null
  total: number | null
  status: string | null
  created_at: string
  vendors: { name: string } | { name: string }[] | null
}

function vendorName(vendor: AdminOrder["vendors"]) {
  return Array.isArray(vendor) ? vendor[0]?.name ?? "No vendor" : vendor?.name ?? "No vendor"
}

export function AdminOrdersScreen() {
  const { back } = useApp()
  const { data: profile, isLoading: profileLoading } = useSWR("current-profile", getCurrentProfile)
  const { data, isLoading } = useSWR("admin-orders", getAdminOrders, { shouldRetryOnError: false })
  if (profileLoading) return <p className="p-6 text-sm text-muted-foreground">Loading orders...</p>
  if (profile?.data?.role !== "admin") return <p className="p-6 text-sm text-muted-foreground">You don&apos;t have access to this section.</p>
  const orders = (data?.data ?? []) as AdminOrder[]
  const groups = orders.reduce<Map<string, { label: string; orders: AdminOrder[]; total: number }>>((result, order) => {
    const date = new Date(order.created_at)
    const key = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Africa/Lagos" }).format(date)
    const current = result.get(key) ?? { label: lagosMonth.format(date), orders: [], total: 0 }
    current.orders.push(order)
    current.total += order.total ?? 0
    result.set(key, current)
    return result
  }, new Map())

  return <div className="pb-8">
    <ScreenHeader title={`Total Orders (${orders.length})`} subtitle="All orders grouped by Lagos time" onBack={back} />
    <div className="space-y-5 px-5 pt-5">
      {isLoading ? <p className="py-12 text-center text-sm text-muted-foreground">Loading orders...</p> : null}
      {data?.error ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">Could not load orders. Please refresh.</p> : null}
      {!isLoading && !data?.error && orders.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">No orders yet.</p> : null}
      {[...groups.entries()].map(([key, group]) => <section key={key}>
        <div className="mb-3 flex items-end justify-between"><div><h2 className="text-base font-extrabold text-foreground">{group.label}</h2><p className="mt-1 text-xs text-muted-foreground">{group.orders.length} {group.orders.length === 1 ? "order" : "orders"}</p></div><p className="text-sm font-extrabold text-brand">{formatNaira(group.total)}</p></div>
        <div className="space-y-3">{group.orders.map((order) => <article key={order.id} className="rounded-3xl border border-border bg-card p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-foreground">{order.order_code}</p><p className="mt-1 text-xs text-muted-foreground">{order.customer_name ?? "Unknown customer"}</p></div><span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold capitalize text-brand">{(order.status ?? "unknown").replaceAll("_", " ")}</span></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><p className="text-muted-foreground">Vendor</p><p className="mt-1 font-semibold text-foreground">{vendorName(order.vendors)}</p></div><div><p className="text-muted-foreground">Total</p><p className="mt-1 font-semibold text-foreground">{formatNaira(order.total)}</p></div></div><p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{lagosDate.format(new Date(order.created_at))}</p></article>)}</div>
      </section>)}
    </div>
  </div>
}
