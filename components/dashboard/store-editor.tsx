"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { Bike, Camera, Clock, Eye, EyeOff, Film, ImagePlus, Loader2, Pencil, Plus, Star, Store, X } from "lucide-react"
import {
  adminSaveProduct, adminSaveVendor, getEditorProducts, getEditorVendors,
  type EditorProduct, type EditorVendor, type ProductInput, type VendorInput,
} from "@/app/actions/store-editor"
import { STORE_CATEGORIES } from "@/lib/store-categories"
import { uploadMenuMedia, MAX_VIDEO_MB, MAX_VIDEO_SECONDS, type MediaKind } from "@/lib/menu-media"
import { CatalogImage } from "@/components/app/catalog-image"
import { ActionButton, Badge, EmptyState, ErrorBanner, ListSkeleton, Panel, SearchInput, naira } from "@/components/dashboard/kit"
import { cn } from "@/lib/utils"

type Notify = (text: string, tone?: "error") => void

const inputClass = "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
const labelClass = "block text-xs font-semibold text-muted-foreground"

type VendorDraft = { name: string; category: string; image_url: string; delivery_minutes: string; is_active: boolean }
type ProductDraft = { name: string; description: string; price: string; category: string; image_url: string; video_url: string; is_available: boolean }

const toVendorDraft = (v: EditorVendor | null): VendorDraft => ({
  name: v?.name ?? "",
  category: v && (STORE_CATEGORIES as readonly string[]).includes(v.category) ? v.category : "Food",
  image_url: v?.image_url ?? "",
  delivery_minutes: v?.delivery_minutes != null ? String(v.delivery_minutes) : "30",
  is_active: v?.is_active ?? false,
})
const toProductDraft = (p: EditorProduct | null): ProductDraft => ({
  name: p?.name ?? "",
  description: p?.description ?? "",
  price: p ? String(p.price) : "",
  category: p?.category ?? "",
  image_url: p?.image_url ?? "",
  video_url: p?.video_url ?? "",
  is_available: p?.is_available ?? true,
})

/**
 * Admin Store editor: choose a vendor, edit its details, banner and products, and see a
 * phone preview of exactly what customers will see (updates live, before saving).
 */
export function StoreEditor({ notify }: { notify: Notify }) {
  const { data: vendorsRes, isLoading, mutate: reloadVendors } = useSWR("store-editor-vendors", getEditorVendors)
  const vendors = vendorsRes?.data ?? []
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null)
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<"edit" | "preview">("edit")

  // Default to the first visible vendor.
  useEffect(() => {
    if (!selectedId && vendors.length) setSelectedId(vendors[0].id)
  }, [selectedId, vendors])

  const selected = selectedId && selectedId !== "new" ? vendors.find((v) => v.id === selectedId) ?? null : null
  const q = query.trim().toLowerCase()
  const visible = vendors.filter((v) => !q || v.name.toLowerCase().includes(q))

  const { data: productsRes, isLoading: productsLoading, mutate: reloadProducts } = useSWR(
    selected ? ["store-editor-products", selected.id] : null,
    ([, id]) => getEditorProducts(id),
  )
  const products = productsRes?.data ?? []

  const [vendorDraft, setVendorDraft] = useState<VendorDraft>(toVendorDraft(null))
  const [editing, setEditing] = useState<{ id: string | "new"; draft: ProductDraft } | null>(null)
  useEffect(() => {
    setVendorDraft(toVendorDraft(selected))
    setEditing(null)
  }, [selected?.id, selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (vendorsRes?.error) return <ErrorBanner message={vendorsRes.error} onRetry={() => void reloadVendors()} />

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="min-w-0 flex-1">
            <span className={labelClass}>Vendor to edit</span>
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value || null)}
              className={inputClass}
            >
              {isLoading ? <option>Loading vendors…</option> : null}
              <optgroup label="Visible to customers">
                {visible.filter((v) => v.is_active).map((v) => <option key={v.id} value={v.id}>{v.name} · {v.category}</option>)}
              </optgroup>
              <optgroup label="Hidden from customers">
                {visible.filter((v) => !v.is_active).map((v) => <option key={v.id} value={v.id}>{v.name} · {v.category}</option>)}
              </optgroup>
              {selectedId === "new" ? <option value="new">New vendor</option> : null}
            </select>
          </label>
          <SearchInput value={query} onChange={setQuery} placeholder="Search vendors…" className="lg:w-64" />
          <ActionButton variant="secondary" onClick={() => setSelectedId("new")}><Plus aria-hidden="true" className="size-4" />New vendor</ActionButton>
        </div>
      </Panel>

      {isLoading && !vendorsRes ? <ListSkeleton rows={3} /> : !selectedId ? (
        <Panel><EmptyState icon={Store} title="No vendors yet" body="Add your first vendor with “New vendor”." /></Panel>
      ) : (
        <>
          <div role="tablist" aria-label="Editor view" className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1 xl:hidden">
            {(["edit", "preview"] as const).map((t) => (
              <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("min-h-10 rounded-xl text-sm font-bold", tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                {t === "edit" ? "Edit" : <span className="inline-flex items-center gap-1.5"><Eye aria-hidden="true" className="size-4" />Customer preview</span>}
              </button>
            ))}
          </div>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className={cn("flex min-w-0 flex-col gap-5", tab === "preview" && "hidden xl:flex")}>
              <VendorForm
                key={selectedId}
                vendor={selected}
                draft={vendorDraft}
                setDraft={setVendorDraft}
                notify={notify}
                onSaved={async (id) => { await reloadVendors(); setSelectedId(id) }}
              />
              {selected ? (
                <ProductsPanel
                  vendorId={selected.id}
                  products={products}
                  loading={productsLoading}
                  error={productsRes?.error ?? null}
                  editing={editing}
                  setEditing={setEditing}
                  notify={notify}
                  reload={async () => { await reloadProducts() }}
                />
              ) : (
                <Panel><p className="text-sm text-muted-foreground">Create the vendor first, then add its banner and products.</p></Panel>
              )}
            </div>
            <aside aria-label="Customer preview" className={cn("xl:block", tab === "edit" && "hidden")}>
              <div className="xl:sticky xl:top-24">
                <p className="mb-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-success" />What customers see
                </p>
                <CustomerPreview vendor={vendorDraft} products={products} editing={editing} />
                <p className="mt-2 text-center text-[11px] text-muted-foreground">Shows your unsaved changes. Customers see them after you press Save.</p>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------- vendor form --- */

function VendorForm({ vendor, draft, setDraft, notify, onSaved }: { vendor: EditorVendor | null; draft: VendorDraft; setDraft: (d: VendorDraft) => void; notify: Notify; onSaved: (id: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const original = toVendorDraft(vendor)
  const dirty = JSON.stringify(original) !== JSON.stringify(draft)
  const legacyCategory = vendor && !(STORE_CATEGORIES as readonly string[]).includes(vendor.category) ? vendor.category : null
  const set = <K extends keyof VendorDraft>(k: K, v: VendorDraft[K]) => setDraft({ ...draft, [k]: v })

  async function save() {
    setBusy(true)
    const input: VendorInput = {
      name: draft.name,
      category: draft.category,
      image_url: draft.image_url || null,
      delivery_minutes: draft.delivery_minutes === "" ? null : Number(draft.delivery_minutes),
      is_active: draft.is_active,
    }
    const res = await adminSaveVendor(vendor?.id ?? null, input)
    setBusy(false)
    if (res.error || !res.data) { notify(res.error ?? "Couldn't save.", "error"); return }
    notify(vendor ? `${draft.name.trim()} saved. Customers see it now.` : `${draft.name.trim()} created. Add its banner and products next.`)
    await onSaved(res.data.id)
  }

  return (
    <Panel title={vendor ? "Store details" : "New vendor"} icon={Store}>
      <div className="flex flex-col gap-4">
        {vendor ? (
          <MediaField
            kind="photo"
            label="Banner photo"
            hint="Shown at the top of the store and on its card in the customer app. A wide photo works best."
            url={draft.image_url}
            vendorId={vendor.id}
            onChange={(url) => set("image_url", url)}
            notify={notify}
            wide
          />
        ) : null}
        <label className={labelClass}>Store name
          <input value={draft.name} onChange={(e) => set("name", e.target.value)} maxLength={80} className={inputClass} />
        </label>
        <fieldset>
          <legend className={labelClass}>Category</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {STORE_CATEGORIES.map((c) => (
              <button key={c} type="button" aria-pressed={draft.category === c} onClick={() => set("category", c)}
                className={cn("min-h-10 rounded-xl border px-4 text-sm font-semibold", draft.category === c ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground")}>
                {c}
              </button>
            ))}
          </div>
          {legacyCategory ? <p className="mt-1.5 text-[11px] text-warning-strong">Currently “{legacyCategory}”, which the customer app doesn’t show. Pick Food or Groceries and save.</p> : null}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Delivery time (minutes)
            <input type="number" inputMode="numeric" min={5} max={180} value={draft.delivery_minutes} onChange={(e) => set("delivery_minutes", e.target.value)} className={inputClass} />
          </label>
          <div>
            <span className={labelClass}>Visible to customers</span>
            <button type="button" role="switch" aria-checked={draft.is_active} onClick={() => set("is_active", !draft.is_active)}
              className={cn("mt-1 flex min-h-[42px] w-full items-center justify-between rounded-xl border px-3 text-sm font-semibold", draft.is_active ? "border-success/40 bg-success/10 text-success" : "border-border bg-background text-muted-foreground")}>
              <span className="inline-flex items-center gap-2">{draft.is_active ? <Eye aria-hidden="true" className="size-4" /> : <EyeOff aria-hidden="true" className="size-4" />}{draft.is_active ? "Visible in the app" : "Hidden"}</span>
              <span className={cn("relative h-6 w-11 rounded-full transition-colors", draft.is_active ? "bg-success" : "bg-border")}><span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", draft.is_active ? "left-[22px]" : "left-0.5")} /></span>
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton onClick={() => void save()} busy={busy} disabled={!dirty || busy}>{vendor ? "Save store details" : "Create vendor"}</ActionButton>
          {dirty && vendor ? <button type="button" onClick={() => setDraft(original)} className="text-sm font-semibold text-muted-foreground hover:underline">Undo changes</button> : null}
          {!dirty && vendor ? <span className="text-xs text-muted-foreground">All changes saved</span> : null}
        </div>
      </div>
    </Panel>
  )
}

/* ---------------------------------------------------------------- products --- */

function ProductsPanel({ vendorId, products, loading, error, editing, setEditing, notify, reload }: {
  vendorId: string; products: EditorProduct[]; loading: boolean; error: string | null
  editing: { id: string | "new"; draft: ProductDraft } | null
  setEditing: (e: { id: string | "new"; draft: ProductDraft } | null) => void
  notify: Notify; reload: () => Promise<void>
}) {
  const [toggling, setToggling] = useState<string | null>(null)

  async function toggle(p: EditorProduct) {
    setToggling(p.id)
    const res = await adminSaveProduct(vendorId, p.id, { ...p, is_available: !p.is_available })
    setToggling(null)
    if (res.error) notify(res.error, "error")
    else notify(p.is_available ? `${p.name} is now sold out (hidden from customers).` : `${p.name} is available again.`)
    await reload()
  }

  return (
    <Panel
      title={`Products · ${products.length}`}
      action={<ActionButton size="sm" onClick={() => setEditing({ id: "new", draft: toProductDraft(null) })}><Plus aria-hidden="true" className="size-4" />Add product</ActionButton>}
      bodyClassName="p-0"
    >
      {error ? <div className="p-4"><ErrorBanner message={error} onRetry={() => void reload()} /></div> : null}
      {editing?.id === "new" ? (
        <div className="border-b border-border p-4"><ProductEditor vendorId={vendorId} product={null} editing={editing} setEditing={setEditing} notify={notify} reload={reload} /></div>
      ) : null}
      {loading ? <div className="p-4"><ListSkeleton rows={3} /></div> : products.length === 0 && editing?.id !== "new" ? (
        <EmptyState icon={Store} title="No products yet" body="Add the first product customers can order." />
      ) : (
        <ul>
          {products.map((p) => (
            <li key={p.id} className="border-b border-border last:border-0">
              {editing?.id === p.id ? (
                <div className="p-4"><ProductEditor vendorId={vendorId} product={p} editing={editing} setEditing={setEditing} notify={notify} reload={reload} /></div>
              ) : (
                <div className={cn("flex items-center gap-3 p-4", !p.is_available && "bg-secondary/40")}>
                  <div className={cn("relative size-14 shrink-0 overflow-hidden rounded-xl bg-secondary", !p.is_available && "opacity-50 grayscale")}>
                    <CatalogImage name={p.name} imageUrl={p.image_url} sizes="56px" fallbackClassName="text-[9px] leading-tight" />
                    {p.video_url ? <span className="absolute bottom-0.5 right-0.5 flex size-5 items-center justify-center rounded-md bg-black/70 text-white"><Film aria-label="Has video" className="size-3" /></span> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{p.name}</p>
                    {p.description ? <p className="truncate text-xs text-muted-foreground">{p.description}</p> : null}
                    <p className="text-sm font-extrabold tabular-nums">{naira(p.price)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <button type="button" role="switch" aria-checked={p.is_available} aria-label={`${p.name} available`} disabled={toggling === p.id} onClick={() => void toggle(p)} className="disabled:opacity-50">
                      <Badge tone={p.is_available ? "success" : "neutral"}>{toggling === p.id ? "Saving…" : p.is_available ? "Available" : "Sold out"}</Badge>
                    </button>
                    <button type="button" onClick={() => setEditing({ id: p.id, draft: toProductDraft(p) })} className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">
                      <Pencil aria-hidden="true" className="size-3" />Edit
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function ProductEditor({ vendorId, product, editing, setEditing, notify, reload }: {
  vendorId: string; product: EditorProduct | null
  editing: { id: string | "new"; draft: ProductDraft }
  setEditing: (e: { id: string | "new"; draft: ProductDraft } | null) => void
  notify: Notify; reload: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const draft = editing.draft
  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) => setEditing({ ...editing, draft: { ...draft, [k]: v } })

  async function save() {
    setBusy(true)
    const input: ProductInput = {
      name: draft.name,
      description: draft.description || null,
      price: Number(draft.price),
      category: draft.category || null,
      image_url: draft.image_url || null,
      video_url: draft.video_url || null,
      is_available: draft.is_available,
    }
    const res = await adminSaveProduct(vendorId, product?.id ?? null, input)
    setBusy(false)
    if (res.error) { notify(res.error, "error"); return }
    notify(product ? `${input.name.trim()} saved.` : `${input.name.trim()} added.`)
    setEditing(null)
    await reload()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold">{product ? `Edit ${product.name}` : "New product"}</p>
        <button type="button" onClick={() => setEditing(null)} aria-label="Cancel" className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"><X aria-hidden="true" className="size-4" /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <label className={labelClass}>Name<input value={draft.name} onChange={(e) => set("name", e.target.value)} maxLength={80} className={inputClass} /></label>
        <label className={labelClass}>Price (₦)<input type="number" inputMode="decimal" min={0} step="any" value={draft.price} onChange={(e) => set("price", e.target.value)} className={inputClass} /></label>
      </div>
      <label className={labelClass}>Description<textarea rows={2} maxLength={300} value={draft.description} onChange={(e) => set("description", e.target.value)} className={inputClass} /></label>
      <label className={labelClass}>Menu section (optional)<input value={draft.category} onChange={(e) => set("category", e.target.value)} maxLength={40} placeholder="e.g. Rice, Drinks" className={inputClass} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <MediaField kind="photo" label="Photo" url={draft.image_url} vendorId={vendorId} onChange={(url) => set("image_url", url)} notify={notify} />
        <MediaField kind="video" label="Video (optional)" hint={`Up to ${MAX_VIDEO_SECONDS}s, ${MAX_VIDEO_MB} MB`} url={draft.video_url} vendorId={vendorId} onChange={(url) => set("video_url", url)} notify={notify} />
      </div>
      <label className="flex items-center gap-2.5 text-sm font-semibold">
        <input type="checkbox" checked={draft.is_available} onChange={(e) => set("is_available", e.target.checked)} className="size-4 accent-[var(--brand)]" />
        Available to order
      </label>
      <div className="flex gap-2">
        <ActionButton variant="secondary" onClick={() => setEditing(null)}>Cancel</ActionButton>
        <ActionButton onClick={() => void save()} busy={busy} disabled={busy}>{product ? "Save product" : "Add product"}</ActionButton>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ media picker --- */

function MediaField({ kind, label, hint, url, vendorId, onChange, notify, wide = false }: {
  kind: MediaKind; label: string; hint?: string; url: string; vendorId: string
  onChange: (url: string) => void; notify: Notify; wide?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  async function pick(file: File | undefined) {
    if (!file) return
    setUploading(true)
    const res = await uploadMenuMedia(file, kind, vendorId)
    setUploading(false)
    if ("error" in res) notify(res.error, "error")
    else onChange(res.url)
  }
  const Icon = kind === "photo" ? (wide ? ImagePlus : Camera) : Film
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <div className={cn("relative mt-1 overflow-hidden rounded-xl border border-dashed border-border bg-secondary", wide ? "aspect-[16/7]" : "aspect-[4/3]")}>
        {url ? (
          kind === "photo"
            ? <CatalogImage name={label} imageUrl={url} sizes={wide ? "600px" : "200px"} />
            : <video src={url} controls playsInline preload="metadata" className="absolute inset-0 size-full bg-black object-contain" />
        ) : (
          <button type="button" disabled={uploading} onClick={() => input.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-brand disabled:opacity-60">
            {uploading ? <Loader2 aria-hidden="true" className="size-6 animate-spin" /> : <Icon aria-hidden="true" className="size-6" />}
            <span className="text-xs font-bold">{uploading ? "Uploading…" : `Add ${kind}`}</span>
          </button>
        )}
        {url && uploading ? <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white"><Loader2 aria-label="Uploading" className="size-6 animate-spin" /></div> : null}
      </div>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
      {url ? (
        <div className="mt-1.5 flex gap-3 text-xs font-bold">
          <button type="button" disabled={uploading} onClick={() => input.current?.click()} className="text-brand hover:underline disabled:opacity-50">Change</button>
          <button type="button" disabled={uploading} onClick={() => onChange("")} className="text-muted-foreground hover:underline disabled:opacity-50">Remove</button>
        </div>
      ) : null}
      <input ref={input} type="file" accept={kind === "photo" ? "image/*" : "video/mp4,video/quicktime,video/webm,video/*"} className="sr-only" tabIndex={-1} aria-label={`Choose ${label}`} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = "" }} />
    </div>
  )
}

/* ---------------------------------------------------------- customer preview --- */

/** Mirrors the customer app's vendor page (components/screens/vendor-screen.tsx), using unsaved edits. */
function CustomerPreview({ vendor, products, editing }: { vendor: VendorDraft; products: EditorProduct[]; editing: { id: string | "new"; draft: ProductDraft } | null }) {
  const shown = useMemo(() => {
    const list = products.map((p) => (editing && editing.id === p.id ? { ...p, ...draftToProduct(editing.draft) } : p))
    if (editing?.id === "new" && editing.draft.name.trim()) list.unshift({ id: "new", vendor_id: "", ...draftToProduct(editing.draft) } as EditorProduct)
    return list
  }, [products, editing])
  const available = shown.filter((p) => p.is_available)
  const name = vendor.name.trim() || "Store name"
  const mins = vendor.delivery_minutes ? `${vendor.delivery_minutes} min` : "Not listed"

  return (
    <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[34px] border-[7px] border-[#1d1d1d] bg-background shadow-[0_30px_60px_-30px_rgb(0_0_0/0.5)]">
      <div className="max-h-[720px] overflow-y-auto">
        <div className="relative h-44 w-full bg-secondary">
          {vendor.image_url ? <CatalogImage name={name} imageUrl={vendor.image_url} sizes="360px" /> : (
            <div className="absolute inset-0 flex items-center justify-center bg-brand px-4 text-center text-xl font-extrabold text-white">{name}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
        </div>
        <div className="relative -mt-6 rounded-t-3xl bg-background px-4 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words text-lg font-extrabold tracking-tight">{name}</h3>
              <p className="text-sm text-muted-foreground">{vendor.category}</p>
            </div>
            <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", vendor.is_active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground")}>
              {vendor.is_active ? "Open now" : "Hidden"}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[{ icon: Star, label: "No rating", sub: "Rating" }, { icon: Clock, label: mins, sub: "Delivery" }, { icon: Bike, label: "Delivery", sub: "Fee at checkout" }].map((s) => (
              <div key={s.sub} className="flex flex-col items-center gap-1 rounded-2xl bg-secondary px-2 py-2.5 text-center">
                <s.icon aria-hidden="true" className="size-4 text-brand" />
                <span className="text-[11px] font-bold">{s.label}</span>
                <span className="text-[10px] text-muted-foreground">{s.sub}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 pb-5 pt-4">
          <p className="text-xs font-extrabold uppercase tracking-wider">Menu</p>
          {available.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">No products customers can order yet.</p> : (
            <ul className="mt-2 flex flex-col gap-2.5">
              {available.map((p) => (
                <li key={p.id} className="flex gap-3 rounded-2xl border border-border bg-card p-2.5">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    <CatalogImage name={p.name} imageUrl={p.image_url} sizes="64px" fallbackClassName="text-[9px] leading-tight" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{p.name || "Product name"}</p>
                    {p.description ? <p className="line-clamp-2 text-[11px] text-muted-foreground">{p.description}</p> : null}
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm font-extrabold text-brand">{naira(p.price)}</span>
                      <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-brand text-white"><Plus className="size-3.5" /></span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {shown.length > available.length ? <p className="mt-3 text-center text-[11px] text-muted-foreground">{shown.length - available.length} sold-out product{shown.length - available.length > 1 ? "s" : ""} hidden from customers</p> : null}
        </div>
      </div>
    </div>
  )
}

function draftToProduct(d: ProductDraft) {
  return {
    name: d.name,
    description: d.description || null,
    price: Number(d.price) || 0,
    category: d.category || null,
    image_url: d.image_url || null,
    video_url: d.video_url || null,
    is_available: d.is_available,
    stock_quantity: null,
  }
}
