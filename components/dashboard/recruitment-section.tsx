"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Bike, Download, FileText, Inbox, Loader2, Sparkles, Store } from "lucide-react"
import {
  getApplicationFiles, getRecruitment, updateRecruitStatus,
  type RiderApplication, type VendorApplication, type WaitlistSignup,
} from "@/app/actions/recruit-admin"
import { Badge, EmptyState, ErrorBanner, FilterTabs, ListSkeleton, NeedsSetup, Panel, SearchInput, StatCard, StatGrid, formatDateTime, naira } from "@/components/dashboard/kit"

type Kind = "waitlist" | "vendor" | "rider"
const STATUS_OPTIONS: Record<Kind, string[]> = {
  waitlist: ["new", "contacted", "archived"],
  vendor: ["new", "reviewing", "approved", "rejected"],
  rider: ["new", "reviewing", "shortlisted", "approved", "rejected"],
}
const tone = (s: string) => (s === "approved" || s === "contacted" ? "success" : s === "rejected" || s === "archived" ? "neutral" : s === "new" ? "brand" : "warning") as "success" | "neutral" | "brand" | "warning"
const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "234")}`

/** Admin review of pre-launch sign-ups from /join. */
export function RecruitmentSection({ notify }: { notify: (text: string, tone?: "error") => void }) {
  const { data, error, isLoading, mutate } = useSWR("admin-recruitment", getRecruitment, { refreshInterval: 60_000 })
  const [kind, setKind] = useState<Kind>("waitlist")
  const [status, setStatus] = useState("all")
  const [q, setQ] = useState("")
  const d = data?.data

  const rows = useMemo(() => {
    const list: (WaitlistSignup | VendorApplication | RiderApplication)[] = !d ? [] : kind === "waitlist" ? d.waitlist : kind === "vendor" ? d.vendors : d.riders
    const term = q.trim().toLowerCase()
    return list.filter((r) => (status === "all" || r.status === status) && (!term || JSON.stringify(r).toLowerCase().includes(term)))
  }, [d, kind, status, q])

  if (d?.setupNeeded) {
    return <NeedsSetup audience="admin" title="Sign-up storage isn't set up yet" body="Apply supabase/migrations/20261121_recruitment_forms.sql in Supabase. It creates private tables for the waitlist and vendor/rider applications, plus a private bucket for uploaded documents. Until then, forms on /join show an error instead of saving." items={["Customer waitlist", "Vendor applications with photos", "Rider applications with private documents"]} />
  }

  async function change(k: Kind, id: string, next: string) {
    const res = await updateRecruitStatus(k, id, next)
    if (res.error) notify(res.error, "error")
    else notify(`Marked ${next}.`)
    await mutate()
  }

  function exportCsv() {
    if (!rows.length) return
    const keys = Object.keys(rows[0]).filter((k) => k !== "products")
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => esc((r as Record<string, unknown>)[k])).join(","))].join("\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = `doors-${kind}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="flex flex-col gap-5">
      {error || data?.error ? <ErrorBanner message={data?.error ?? "Couldn't load sign-ups."} onRetry={() => void mutate()} /> : null}
      <StatGrid>
        <StatCard label="Waitlist" value={String(d?.waitlist.length ?? 0)} icon={Sparkles} hint={`${d?.waitlist.filter((w) => w.status === "new").length ?? 0} new`} onClick={() => setKind("waitlist")} />
        <StatCard label="Vendor applications" value={String(d?.vendors.length ?? 0)} icon={Store} tone="dark" hint={`${d?.vendors.filter((w) => w.status === "new").length ?? 0} new`} onClick={() => setKind("vendor")} />
        <StatCard label="Rider applications" value={String(d?.riders.length ?? 0)} icon={Bike} tone="warning" hint={`${d?.riders.filter((w) => w.status === "new").length ?? 0} new`} onClick={() => setKind("rider")} />
        <StatCard label="Signed up today" value={String([...(d?.waitlist ?? []), ...(d?.vendors ?? []), ...(d?.riders ?? [])].filter((r) => r.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length)} icon={Inbox} tone="success" />
      </StatGrid>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs label="Sign-up type" value={kind} onChange={(k) => { setKind(k); setStatus("all") }} options={[
          { value: "waitlist", label: "Waitlist", count: d?.waitlist.length },
          { value: "vendor", label: "Vendors", count: d?.vendors.length },
          { value: "rider", label: "Riders", count: d?.riders.length },
        ]} />
        <div className="flex gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, phone, area…" className="min-w-0 flex-1 lg:w-72" />
          <button type="button" onClick={exportCsv} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-bold"><Download aria-hidden="true" className="size-4" />CSV</button>
        </div>
      </div>
      <FilterTabs label="Status" value={status} onChange={setStatus} options={[{ value: "all", label: "All" }, ...STATUS_OPTIONS[kind].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]} />
      {isLoading && !d ? <ListSkeleton rows={4} /> : rows.length === 0 ? (
        <Panel><EmptyState icon={Inbox} title="Nothing here yet" body="Sign-ups from the DOORS landing page (/join) appear here." /></Panel>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => <RecordCard key={r.id} kind={kind} r={r} onStatus={(s) => change(kind, r.id, s)} />)}
        </div>
      )}
    </div>
  )
}

function RecordCard({ kind, r, onStatus }: { kind: Kind; r: WaitlistSignup | VendorApplication | RiderApplication; onStatus: (s: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const title = kind === "vendor" ? (r as VendorApplication).business_name : (r as WaitlistSignup).full_name
  const sub = kind === "waitlist" ? `${(r as WaitlistSignup).area} · wants ${(r as WaitlistSignup).service}` : kind === "vendor" ? `${(r as VendorApplication).category} · ${(r as VendorApplication).owner_name}` : `${(r as RiderApplication).vehicle_type} · ${(r as RiderApplication).availability}`
  const details: [string, string | null | undefined][] = kind === "waitlist"
    ? [["Email", (r as WaitlistSignup).email], ["WhatsApp", (r as WaitlistSignup).whatsapp], ["Favourite", (r as WaitlistSignup).favourite], ["Comments", (r as WaitlistSignup).comments]]
    : kind === "vendor"
      ? (() => { const v = r as VendorApplication; return [["Email", v.email], ["WhatsApp", v.whatsapp], ["Address", v.address], ["Landmark", v.landmark], ["Hours", v.operating_hours], ["Social", v.social_link], ["CAC", v.registration_status.replace("_", " ")], ["Contact by", v.contact_method], ["Description", v.description], ["Products", v.products.map((p) => `${p.name}${p.price ? ` (${naira(p.price)})` : ""}`).join(", ")], ["Menu", v.menu_text], ["Files", String(v.files_uploaded)]] as [string, string | null][] })()
      : (() => { const v = r as RiderApplication; return [["Email", v.email], ["WhatsApp", v.whatsapp], ["Lives in", v.residential_area], ["Vehicle access", v.vehicle_access], ["Experience", v.experience], ["Emergency contact", `${v.emergency_name} · ${v.emergency_phone}`], ["Files", String(v.files_uploaded)]] as [string, string | null][] })()

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-foreground">{title}</p>
          <p className="text-xs capitalize text-muted-foreground">{sub}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(r.created_at)} · <a href={`tel:${r.phone}`} className="font-semibold text-foreground underline">{r.phone}</a> · <a href={waLink((r as { whatsapp?: string | null }).whatsapp || r.phone)} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1F9D55] underline">WhatsApp</a></p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={tone(r.status)}>{r.status}</Badge>
          <select aria-label={`Status for ${title}`} value={r.status} disabled={busy} onChange={async (e) => { setBusy(true); await onStatus(e.target.value); setBusy(false) }} className="h-9 rounded-xl border border-border bg-background px-2 text-xs font-semibold capitalize">
            {STATUS_OPTIONS[kind].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-2 text-xs font-bold text-brand hover:underline">{open ? "Hide details" : "View details"}</button>
      {open ? (
        <div className="mt-3 border-t border-border pt-3">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {details.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="whitespace-pre-wrap break-words">{v}</dd></div>)}
          </dl>
          {kind !== "waitlist" ? <Files kind={kind} id={r.id} /> : null}
        </div>
      ) : null}
    </article>
  )
}

function Files({ kind, id }: { kind: "vendor" | "rider"; id: string }) {
  const { data, isLoading } = useSWR(["application-files", kind, id], () => getApplicationFiles(kind, id))
  if (isLoading) return <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 aria-hidden="true" className="size-3.5 animate-spin" />Loading files…</p>
  if (data?.error) return <p className="mt-3 text-xs text-destructive">{data.error}</p>
  if (!data?.data.length) return <p className="mt-3 text-xs text-muted-foreground">No files uploaded.</p>
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-muted-foreground">Files (private, links expire in 10 minutes)</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {data.data.map((f) => (
          <li key={f.name}>
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-border px-2 py-1.5 text-xs font-semibold hover:bg-secondary">
              {/\.(jpg|jpeg|png|webp)$/i.test(f.name) ? <img src={f.url} alt="" className="size-10 rounded-lg object-cover" /> : <FileText aria-hidden="true" className="size-5" />}
              {f.name.replace(/-[a-z0-9]{6}\./, ".")}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
