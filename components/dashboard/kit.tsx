"use client"

import { useEffect, useState, type ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Database, Inbox, Search, Sparkles, X, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { STATUS_META, type OrderStatus, type Tone } from "@/lib/order-status"

/* ----------------------------------------------------------------------------
 * Formatting
 * ------------------------------------------------------------------------- */

const lagosDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" })
const lagosShort = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
const lagosWeekday = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", weekday: "short" })

/** YYYY-MM-DD in Lagos time. */
export function lagosDateKey(value: string | number | Date) {
  return lagosDay.format(new Date(value))
}

export function todayKey() {
  return lagosDateKey(Date.now())
}

export function formatDateTime(value: string | null | undefined) {
  return value ? lagosShort.format(new Date(value)) : "—"
}

export function naira(amount: number | null | undefined, compact = false) {
  const value = Number(amount) || 0
  if (compact && Math.abs(value) >= 100_000) {
    return `₦${new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`
  }
  return `₦${value.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`
}

export function timeAgo(value: string | null | undefined, now = Date.now()) {
  if (!value) return "—"
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000))
  if (seconds < 45) return "just now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return days < 30 ? `${days}d ago` : formatDateTime(value)
}

/** Re-render every `ms` so relative times stay fresh. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

/** Last `days` Lagos dates (oldest first) with labels. */
export function lastDays(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.now() - (days - 1 - index) * 86_400_000)
    return { key: lagosDateKey(date), label: lagosWeekday.format(date) }
  })
}

/* ----------------------------------------------------------------------------
 * Status badge
 * ------------------------------------------------------------------------- */

const toneClass: Record<Tone, string> = {
  neutral: "bg-secondary text-muted-foreground",
  brand: "bg-brand-soft text-brand",
  info: "bg-sky-50 text-sky-700",
  warning: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700",
  danger: "bg-red-50 text-red-700",
}

const dotClass: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  brand: "bg-brand",
  info: "bg-sky-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  danger: "bg-red-500",
}

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold", toneClass[tone], className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", dotClass[tone])} />
      {children}
    </span>
  )
}

export function StatusBadge({ status, audience = "admin" }: { status: string; audience?: "admin" | "vendor" | "rider" }) {
  const meta = STATUS_META[status as OrderStatus]
  if (!meta) return <Badge>{status.replaceAll("_", " ")}</Badge>
  const label = audience === "vendor" ? meta.vendorLabel : audience === "rider" ? meta.riderLabel : meta.label
  return <Badge tone={meta.tone}>{label}</Badge>
}

export function PaymentBadge({ method, status }: { method: string | null; status: string | null }) {
  const tone: Tone = status === "paid" ? "success" : status === "failed" ? "danger" : status === "refunded" ? "neutral" : "warning"
  const label = method === "cash" ? "Cash on delivery" : method === "transfer" ? "Transfer" : method === "card" ? "Card" : method ?? "—"
  return (
    <span className="inline-flex flex-col gap-1">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <Badge tone={tone} className="self-start capitalize">{status ?? "unpaid"}</Badge>
    </span>
  )
}

/* ----------------------------------------------------------------------------
 * Surfaces
 * ------------------------------------------------------------------------- */

export function Panel({ title, icon: Icon, action, children, className, bodyClassName }: { title?: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)]", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            {Icon ? <Icon aria-hidden="true" className="size-4 text-brand" /> : null}
            {title}
          </h2>
          {action}
        </header>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  )
}

export function StatCard({ label, value, icon: Icon, hint, tone = "brand", onClick }: { label: string; value: string; icon: LucideIcon; hint?: string; tone?: "brand" | "dark" | "success" | "warning"; onClick?: () => void }) {
  const iconTone = {
    brand: "bg-brand-soft text-brand",
    dark: "bg-foreground text-background",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
  }[tone]
  const body = (
    <>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-11", iconTone)}>
        <Icon aria-hidden="true" className="size-[18px] sm:size-5" />
      </span>
      <span className="w-full min-w-0">
        <span className="block truncate text-xs font-medium text-muted-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-2xl">{value}</span>
        {hint ? <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{hint}</span> : null}
      </span>
    </>
  )
  const base = "flex min-w-0 flex-col items-start gap-2.5 rounded-2xl border border-border bg-card p-3.5 text-left shadow-[0_1px_2px_rgb(16_24_40/0.04)] sm:flex-row sm:items-center sm:gap-4 sm:p-4"
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(base, "transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand")}>{body}</button>
  ) : (
    <div className={base}>{body}</div>
  )
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{children}</div>
}

/* ----------------------------------------------------------------------------
 * States
 * ------------------------------------------------------------------------- */

export function EmptyState({ icon: Icon = Inbox, title, body, action }: { icon?: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <p className="mt-4 text-sm font-bold text-foreground">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

/**
 * Placeholder for a feature that isn't switched on yet.
 * Vendors and riders (the default) see a friendly "Coming soon" card only.
 * Pass audience="admin" to also show the technical setup note; never use that
 * on vendor or rider screens.
 */
export function NeedsSetup({ title, body, items, audience = "partner" }: { title: string; body: string; items?: string[]; audience?: "admin" | "partner" }) {
  const isAdmin = audience === "admin"
  const Icon = isAdmin ? Database : Sparkles
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-6">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          {!isAdmin ? <Badge tone="neutral" className="mb-2">Coming soon</Badge> : null}
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
          {items?.length ? (
            <ul className="mt-3 flex flex-col gap-1.5 text-xs text-muted-foreground">
              {items.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />{item}</li>)}
            </ul>
          ) : null}
          {isAdmin ? <p className="mt-3 text-[11px] font-semibold text-muted-foreground">Needs database migration · supabase/migrations/20261119_dashboard_foundation.sql</p> : null}
        </div>
      </div>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-secondary", className)} />
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[84px] rounded-2xl" />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  )
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
    </div>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1 font-medium">{message}</p>
      {onRetry ? <button type="button" onClick={onRetry} className="shrink-0 text-xs font-bold underline underline-offset-2">Retry</button> : null}
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * Toasts (tiny, local)
 * ------------------------------------------------------------------------- */

export type ToastMessage = { id: number; text: string; tone: "success" | "error" }

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  function push(text: string, tone: ToastMessage["tone"] = "success") {
    const id = Date.now() + Math.random()
    setToasts((list) => [...list.slice(-2), { id, text, tone }])
    window.setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), 4500)
  }
  function dismiss(id: number) {
    setToasts((list) => list.filter((toast) => toast.id !== id))
  }
  return { toasts, push, dismiss }
}

export function Toasts({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col items-center gap-2 lg:bottom-6 lg:left-auto lg:right-6 lg:items-end">
      {toasts.map((toast) => (
        <div key={toast.id} role={toast.tone === "error" ? "alert" : "status"} className={cn("pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg doors-fade-in", toast.tone === "error" ? "bg-red-700" : "bg-foreground")}>
          {toast.tone === "error" ? <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-400" />}
          <span className="flex-1">{toast.text}</span>
          <button type="button" aria-label="Dismiss" onClick={() => onDismiss(toast.id)} className="shrink-0 opacity-70 hover:opacity-100"><X aria-hidden="true" className="size-4" /></button>
        </div>
      ))}
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * Controls
 * ------------------------------------------------------------------------- */

export function SearchInput({ value, onChange, placeholder = "Search…", className }: { value: string; onChange: (value: string) => void; placeholder?: string; className?: string }) {
  return (
    <label className={cn("flex h-10 min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3 text-muted-foreground focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10", className)}>
      <Search aria-hidden="true" className="size-4 shrink-0" />
      <span className="sr-only">{placeholder}</span>
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
    </label>
  )
}

export function FilterTabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (value: T) => void; options: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-brand",
              active ? "bg-brand text-brand-foreground shadow-sm shadow-brand/20" : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", active ? "bg-white/20" : "bg-background")}>{option.count}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function ActionButton({ children, onClick, disabled, variant = "primary", size = "md", className, type = "button", busy }: { children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "sm" | "md" | "lg"; className?: string; type?: "button" | "submit"; busy?: boolean }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-9 px-3 text-xs",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-14 px-6 text-base",
        variant === "primary" && "bg-brand text-brand-foreground shadow-sm shadow-brand/25 hover:brightness-105",
        variant === "secondary" && "border border-border bg-background text-foreground hover:bg-secondary",
        variant === "danger" && "bg-red-50 text-red-700 hover:bg-red-100",
        variant === "ghost" && "text-muted-foreground hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      {busy ? <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : null}
      {children}
    </button>
  )
}

/* ----------------------------------------------------------------------------
 * Chart: simple, honest SVG area chart (no fake data)
 * ------------------------------------------------------------------------- */

export function AreaChart({ points, format = (v) => String(v), height = 220, label }: { points: { label: string; value: number }[]; format?: (value: number) => string; height?: number; label: string }) {
  const width = 640
  const pad = { top: 16, right: 16, bottom: 28, left: 52 }
  const max = Math.max(1, ...points.map((p) => p.value))
  const niceMax = niceCeil(max)
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const x = (i: number) => pad.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = (v: number) => pad.top + innerH - (v / niceMax) * innerH
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")
  const area = `${line} L${x(points.length - 1).toFixed(1)},${pad.top + innerH} L${x(0).toFixed(1)},${pad.top + innerH} Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => niceMax * t)
  const total = points.reduce((sum, p) => sum + p.value, 0)

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label}: ${points.map((p) => `${p.label} ${format(p.value)}`).join(", ")}`} className="h-auto w-full overflow-visible">
        <defs>
          <linearGradient id="doors-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d71920" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#d71920" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="#e4e4e7" strokeDasharray={tick === 0 ? undefined : "3 4"} />
            {total > 0 ? <text x={pad.left - 10} y={y(tick)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[11px]">{format(tick)}</text> : null}
          </g>
        ))}
        {total > 0 ? <path d={area} fill="url(#doors-area)" /> : null}
        <path d={line} fill="none" stroke="#d71920" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.label + i}>
            <circle cx={x(i)} cy={y(p.value)} r="4" fill="#fff" stroke="#d71920" strokeWidth="2.5">
              <title>{`${p.label}: ${format(p.value)}`}</title>
            </circle>
            <text x={x(i)} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-[11px]">{p.label}</text>
          </g>
        ))}
      </svg>
      {total === 0 ? <figcaption className="-mt-2 text-center text-xs text-muted-foreground">No activity in this period yet.</figcaption> : null}
    </figure>
  )
}

function niceCeil(value: number) {
  const exponent = Math.pow(10, Math.floor(Math.log10(value)))
  const fraction = value / exponent
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return nice * exponent
}

/** Horizontal bar list for "top N" breakdowns. */
export function BarList({ rows, format = (v) => String(v) }: { rows: { label: string; value: number; sub?: string }[]; format?: (value: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-semibold text-foreground">{row.label}</span>
            <span className="shrink-0 font-bold tabular-nums text-foreground">{format(row.value)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
          {row.sub ? <p className="mt-1 text-[11px] text-muted-foreground">{row.sub}</p> : null}
        </li>
      ))}
    </ul>
  )
}
