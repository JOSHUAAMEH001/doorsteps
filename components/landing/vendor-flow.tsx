"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Image from "next/image"
import useSWR from "swr"
import { getFormOptions } from "@/app/actions/form-options"
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Eye, Info, MapPin, PencilLine, Plus, Star, Trash2 } from "lucide-react"
import { finalizeApplicationFiles, submitVendorApplication } from "@/app/actions/recruit"
import { uploadApplicationFiles, type PendingFile } from "@/lib/recruit-upload"
import { Check18, Chips, Field, FilePick, FormAlert, Sheet, SheetHeader, Stepper, SubmitButton, inputClass, useObjectUrl } from "@/components/landing/form-ui"
import { ShareDoors } from "@/components/landing/waitlist-form"
import { cn } from "@/lib/utils"

const STEPS = ["Your business", "Products", "Contact", "Review"]

type Product = { key: number; name: string; price: string; photo: File | null }
type Reg = "registered" | "in_progress" | "not_registered"
type Contact = "whatsapp" | "call" | "sms" | "email"

const empty = (key: number): Product => ({ key, name: "", price: "", photo: null })

export function VendorFlow({ open, onClose, initialName }: { open: boolean; onClose: () => void; initialName: string }) {
  return (
    <Sheet open={open} onClose={onClose} label="Register your business on DOORS" wide>
      {open ? <VendorFlowBody onClose={onClose} initialName={initialName} /> : null}
    </Sheet>
  )
}

function VendorFlowBody({ onClose, initialName }: { onClose: () => void; initialName: string }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [tab, setTab] = useState<"form" | "preview">("form")
  const [f, setF] = useState({
    business_name: initialName, category: "", categoryOther: "", description: "", owner_name: "", phone: "", whatsapp: "", email: "", address: "",
    landmark: "", operating_hours: "", social_link: "", menu_text: "", registration_status: "" as Reg | "", contact_method: "whatsapp" as Contact, consent: false,
  })
  const [logo, setLogo] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)
  const [menuFile, setMenuFile] = useState<File | null>(null)
  const [products, setProducts] = useState<Product[]>([empty(1), empty(2)])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [alert, setAlert] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [done, setDone] = useState<null | { duplicate: boolean; failed: number }>(null)

  // Categories are managed by DOORS admins; "Other" lets vendors type their own.
  const { data: options } = useSWR("form-options", getFormOptions, { revalidateOnFocus: false })
  const categories = [...(options?.vendor_categories ?? []), "Other"]
  const category = f.category === "Other" ? f.categoryOther.trim() : f.category
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }))
  const fileError = (msg: string) => setAlert(msg)

  useEffect(() => { scroller.current?.scrollTo({ top: 0, behavior: "smooth" }) }, [step])

  function validate(s: number) {
    const e: Record<string, string> = {}
    if (s === 0) {
      if (f.business_name.trim().length < 2) e.business_name = "Enter your business name."
      if (!f.category) e.category = "Choose a category."
      else if (f.category === "Other" && f.categoryOther.trim().length < 2) e.category = "Type your business category."
    }
    if (s === 1) {
      products.forEach((p) => {
        if (p.price && !/^\d{1,7}(\.\d{1,2})?$/.test(p.price.replace(/,/g, ""))) e[`price-${p.key}`] = "Numbers only, e.g. 2500"
        if (!p.name.trim() && (p.price || p.photo)) e[`name-${p.key}`] = "Add the product name"
      })
    }
    if (s === 2) {
      if (f.owner_name.trim().length < 2) e.owner_name = "Enter the owner's full name."
      if (!/^(0|\+?234)?[789][01]\d{8}$/.test(f.phone.replace(/[\s-]/g, ""))) e.phone = "Enter a valid Nigerian phone number."
      if (f.whatsapp && !/^(0|\+?234)?[789][01]\d{8}$/.test(f.whatsapp.replace(/[\s-]/g, ""))) e.whatsapp = "Enter a valid number or leave it blank."
      if (f.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(f.email.trim())) e.email = "Check the email address."
      if (f.address.trim().length < 3) e.address = "Enter your business location."
      if (!f.registration_status) e.registration_status = "Choose one."
    }
    if (s === 3 && !f.consent) e.consent = "Please agree so we can review your application."
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    setAlert(null)
    if (validate(step)) setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (step < STEPS.length - 1) { next(); return }
    if (busy || !validate(3)) return
    setAlert(null)
    setBusy(true)
    try {
      const named = products.filter((p) => p.name.trim())
      const res = await submitVendorApplication(
        { ...f, category, products: named.map((p) => ({ name: p.name.trim(), price: p.price.replace(/,/g, "") || null })) },
      )
      if (!res.ok) {
        if (res.field) {
          setErrors({ [res.field]: res.error ?? "Check this field." })
          const back = ["business_name", "category"].includes(res.field) ? 0 : res.field === "consent" ? 3 : 2
          setStep(back)
        }
        setAlert(res.error ?? "We couldn't save your application. Please try again.")
        return
      }
      let failed = 0
      if (res.id) {
        const files: PendingFile[] = []
        if (logo) files.push({ label: "logo", file: logo })
        if (cover) files.push({ label: "cover", file: cover })
        named.forEach((p, i) => { if (p.photo) files.push({ label: `product-${i + 1}`, file: p.photo }) })
        if (menuFile) files.push({ label: "menu", file: menuFile })
        if (files.length) {
          setProgress(`Uploading photos 0/${files.length}…`)
          failed = await uploadApplicationFiles("vendor", res.id, files, (d, t) => setProgress(`Uploading photos ${d}/${t}…`))
          await finalizeApplicationFiles("vendor", res.id)
        }
      }
      setDone({ duplicate: Boolean(res.duplicate), failed })
    } catch {
      setAlert("You seem to be offline. Check your connection and try again — nothing was lost.")
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  if (done) {
    return (
      <>
        <SheetHeader title="Application received" onClose={onClose} />
        <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-10">
          <div role="status" className="mx-auto flex max-w-md flex-col items-center gap-4 text-center [animation:landing-rise_.4s_ease-out]">
            <span className="flex size-16 items-center justify-center rounded-full bg-[#E8F7EE] text-[#1F9D55]"><CheckCircle2 aria-hidden="true" className="size-9" /></span>
            <h3 className="font-display text-2xl font-extrabold tracking-tight">
              {done.duplicate ? "We already have your application" : `Thanks! ${f.business_name.trim()} is in the queue.`}
            </h3>
            <p className="text-sm text-[#525252]">
              {done.duplicate
                ? "An application with this phone number was already submitted. Our team will contact you."
                : `Our team will review your application and contact you by ${f.contact_method === "call" ? "phone call" : f.contact_method === "sms" ? "SMS" : f.contact_method === "email" ? "email" : "WhatsApp"}. Approved vendors are onboarded before launch.`}
            </p>
            {done.failed > 0 ? (
              <p className="rounded-2xl bg-[#FFF6E5] px-4 py-3 text-sm font-medium text-[#8A5A00]">Your application was saved, but {done.failed} photo{done.failed > 1 ? "s" : ""} didn&apos;t upload. No problem: we&apos;ll ask for {done.failed > 1 ? "them" : "it"} when we contact you.</p>
            ) : null}
            <div className="w-full pt-2"><ShareDoors text="My business is joining DOORS, the new local delivery platform for ESUT and Agbani. Vendors can register here:" /></div>
            <button type="button" onClick={onClose} className="text-sm font-bold text-[#171717] underline underline-offset-4">Back to DOORS</button>
          </div>
        </div>
      </>
    )
  }

  const form = (
    <form id="vendor-form" onSubmit={(e) => void submit(e)} noValidate className="relative flex flex-col gap-5">
      {step === 0 ? (
        <>
          <Field label="Business name" error={errors.business_name}>
            <input value={f.business_name} onChange={set("business_name")} maxLength={80} aria-invalid={Boolean(errors.business_name)} placeholder="e.g. Mama Ngozi Kitchen" className={inputClass} autoFocus />
          </Field>
          <Chips label="Business category" value={f.category} onChange={(v) => setF((s) => ({ ...s, category: v }))} error={errors.category} options={categories.map((c) => ({ value: c, label: c }))} />
          {f.category === "Other" ? (
            <Field label="Your business category">
              <input value={f.categoryOther} onChange={set("categoryOther")} maxLength={40} placeholder="Type your category" className={inputClass} />
            </Field>
          ) : null}
          <Field label="Describe your business" optional hint="What do you sell? What are you known for?">
            <textarea rows={3} value={f.description} onChange={set("description")} maxLength={600} placeholder="Home-style Nigerian meals: jollof, fried rice, native soups and swallow." className={inputClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <FilePick label="Business logo" file={logo} onChange={setLogo} onError={fileError} />
            <FilePick label="Shop or food photo" file={cover} onChange={setCover} onError={fileError} hint="Used as your store cover" />
          </div>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <p className="flex gap-2 rounded-2xl bg-white p-4 text-sm text-[#525252]"><Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#D71920]" />Add a few things you sell. Watch them appear in your storefront preview. You can add your full menu later.</p>
          {products.map((p, i) => (
            <div key={p.key} className="rounded-3xl border border-[#E7E7E7] bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-extrabold text-[#171717]">Product {i + 1}</p>
                {products.length > 1 ? <button type="button" onClick={() => setProducts((ps) => ps.filter((x) => x.key !== p.key))} aria-label={`Remove product ${i + 1}`} className="flex size-9 items-center justify-center rounded-xl text-[#8A8A8A] hover:bg-[#F3F3F3]"><Trash2 aria-hidden="true" className="size-4" /></button> : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <Field label="Name" optional error={errors[`name-${p.key}`]}>
                  <input value={p.name} onChange={(e) => setProducts((ps) => ps.map((x) => (x.key === p.key ? { ...x, name: e.target.value } : x)))} maxLength={60} placeholder="e.g. Jollof rice & chicken" className={inputClass} />
                </Field>
                <Field label="Price (₦)" optional error={errors[`price-${p.key}`]}>
                  <input inputMode="decimal" value={p.price} onChange={(e) => setProducts((ps) => ps.map((x) => (x.key === p.key ? { ...x, price: e.target.value } : x)))} placeholder="2500" className={inputClass} />
                </Field>
              </div>
              <div className="mt-3"><FilePick compact label="Photo" file={p.photo} onChange={(file) => setProducts((ps) => ps.map((x) => (x.key === p.key ? { ...x, photo: file } : x)))} onError={fileError} /></div>
            </div>
          ))}
          {products.length < 6 ? (
            <button type="button" onClick={() => setProducts((ps) => [...ps, empty(Math.max(0, ...ps.map((x) => x.key)) + 1)])} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#CFCFCF] text-sm font-bold text-[#404040] hover:border-[#171717]">
              <Plus aria-hidden="true" className="size-4" />Add another product
            </button>
          ) : null}
          <Field label="Full menu or product list" optional hint="Type it out, paste it, or upload a photo/PDF below.">
            <textarea rows={4} value={f.menu_text} onChange={set("menu_text")} maxLength={3000} placeholder={"Jollof rice – ₦1,500\nFried rice – ₦1,500\nEgusi & pounded yam – ₦2,000"} className={inputClass} />
          </Field>
          <FilePick label="Menu photo or PDF" allowPdf file={menuFile} onChange={setMenuFile} onError={fileError} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner's full name" error={errors.owner_name}>
              <input value={f.owner_name} onChange={set("owner_name")} autoComplete="name" aria-invalid={Boolean(errors.owner_name)} className={inputClass} />
            </Field>
            <Field label="Phone number" error={errors.phone}>
              <input type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} aria-invalid={Boolean(errors.phone)} placeholder="0803 000 0000" className={inputClass} />
            </Field>
            <Field label="WhatsApp number" optional error={errors.whatsapp}>
              <input type="tel" inputMode="tel" value={f.whatsapp} onChange={set("whatsapp")} placeholder="If different" className={inputClass} />
            </Field>
            <Field label="Email address" optional error={errors.email}>
              <input type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set("email")} className={inputClass} />
            </Field>
          </div>
          <Field label="Business location / address" error={errors.address}>
            <input value={f.address} onChange={set("address")} maxLength={200} aria-invalid={Boolean(errors.address)} placeholder="Street, building or shop number" className={inputClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nearby landmark" optional>
              <input value={f.landmark} onChange={set("landmark")} maxLength={120} placeholder="A well-known place near you" className={inputClass} />
            </Field>
            <Field label="Opening hours" optional>
              <input value={f.operating_hours} onChange={set("operating_hours")} maxLength={120} placeholder="Mon–Sat, 8am – 9pm" className={inputClass} />
            </Field>
          </div>
          <Field label="Instagram or social media" optional error={errors.social_link}>
            <input value={f.social_link} onChange={set("social_link")} maxLength={200} placeholder="@yourbusiness or a link" className={inputClass} />
          </Field>
          <Chips<Reg>
            label="Is your business registered (CAC)?"
            value={f.registration_status}
            onChange={(v) => setF((s) => ({ ...s, registration_status: v }))}
            error={errors.registration_status}
            options={[{ value: "registered", label: "Yes, registered" }, { value: "in_progress", label: "In progress" }, { value: "not_registered", label: "Not registered", hint: "That's okay — you can still apply" }]}
          />
          <Chips<Contact>
            label="Best way to reach you"
            value={f.contact_method}
            onChange={(v) => setF((s) => ({ ...s, contact_method: v }))}
            options={[{ value: "whatsapp", label: "WhatsApp" }, { value: "call", label: "Phone call" }, { value: "sms", label: "SMS" }, { value: "email", label: "Email" }]}
          />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <div className="rounded-3xl bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#8A8A8A]">Summary</p>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["Business", f.business_name], ["Category", category], ["Owner", f.owner_name], ["Phone", f.phone],
                ["Location", f.address], ["Products", `${products.filter((p) => p.name.trim()).length} added`],
                ["Photos", String([logo, cover, menuFile, ...products.map((p) => p.photo)].filter(Boolean).length)], ["Contact by", f.contact_method],
              ].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-[#8A8A8A]">{k}</dt><dd className="break-words font-semibold text-[#171717]">{v || "—"}</dd></div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {STEPS.slice(0, 3).map((s, i) => <button key={s} type="button" onClick={() => setStep(i)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#F3F3F3] px-3 py-2 text-xs font-bold text-[#404040]"><PencilLine aria-hidden="true" className="size-3.5" />Edit {s.toLowerCase()}</button>)}
            </div>
          </div>
          <Check18 checked={f.consent} onChange={(v) => setF((s) => ({ ...s, consent: v }))} error={errors.consent}>
            I confirm these details are correct and agree that DOORS may store them and contact me about joining DOORS as a vendor. See our <a href="/privacy" target="_blank" className="font-semibold underline">privacy notice</a>.
          </Check18>
        </>
      ) : null}
      <FormAlert message={alert} />
    </form>
  )

  return (
    <>
      <SheetHeader title="Register your business" subtitle="About 3 minutes · Free to apply" onClose={onClose}>
        <Stepper steps={STEPS} current={step} />
        <div role="tablist" aria-label="View" className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-[#F3F3F3] p-1 lg:hidden">
          {(["form", "preview"] as const).map((t) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("min-h-10 rounded-xl text-sm font-bold transition-colors", tab === t ? "bg-white text-[#171717] shadow-sm" : "text-[#737373]")}>
              {t === "form" ? "Details" : <span className="inline-flex items-center gap-1.5"><Eye aria-hidden="true" className="size-4" />Live preview</span>}
            </button>
          ))}
        </div>
      </SheetHeader>
      <div className="flex min-h-0 flex-1">
        <div ref={scroller} className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7", tab === "preview" && "hidden lg:block")}>{form}</div>
        <aside aria-label="Live storefront preview" className={cn("min-h-0 overflow-y-auto border-l border-[#EAEAEA] bg-[#171717] p-6 lg:block lg:w-[420px]", tab === "preview" ? "block flex-1" : "hidden")}>
          <StorefrontPreview name={f.business_name} category={category} description={f.description} logo={logo} cover={cover} products={products} hours={f.operating_hours} landmark={f.landmark || f.address} />
        </aside>
      </div>
      <div className="shrink-0 border-t border-[#EAEAEA] bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-7">
        {progress ? <p role="status" className="mb-2 text-center text-xs font-semibold text-[#525252]">{progress}</p> : null}
        <div className="flex gap-3">
          {step > 0 ? (
            <button type="button" onClick={() => { setAlert(null); setStep((s) => s - 1) }} className="inline-flex min-h-13 items-center gap-2 rounded-2xl bg-[#F3F3F3] px-5 text-sm font-bold text-[#171717]"><ArrowLeft aria-hidden="true" className="size-4" />Back</button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => { setTab("form"); next() }} className="inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#171717] px-5 text-[15px] font-extrabold text-white active:scale-[0.98]">Continue<ArrowRight aria-hidden="true" className="size-4" /></button>
          ) : (
            <SubmitButton busy={busy} form="vendor-form" className="flex-1">{busy ? "Submitting…" : "Submit application"}</SubmitButton>
          )}
        </div>
      </div>
    </>
  )
}

/** Live preview of how the vendor's store could look on DOORS. Updates as they type. */
export function StorefrontPreview({ name, category, description, logo, cover, products, hours, landmark, demo = false }: { name: string; category: string; description: string; logo: File | null; cover: File | null; products: { key: number; name: string; price: string; photo: File | null }[]; hours?: string; landmark?: string; demo?: boolean }) {
  const logoUrl = useObjectUrl(logo)
  const coverUrl = useObjectUrl(cover)
  const display = name.trim() || "Your business name"
  const initials = display.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
  const shown = products.filter((p) => p.name.trim() || p.photo).slice(0, 6)
  return (
    <div className="mx-auto w-full max-w-[340px]">
      <p className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/60">
        <span className="size-1.5 animate-pulse rounded-full bg-[#4ADE80]" />{demo ? "Example storefront" : "Live preview"}
      </p>
      <div className="overflow-hidden rounded-[32px] border-[6px] border-[#2A2A2A] bg-[#F7F7F7] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)]">
        <div className="relative h-36 bg-[#D71920]">
          {coverUrl ? <img src={coverUrl} alt="" className="size-full object-cover" /> : (
            <div aria-hidden="true" className="size-full bg-[radial-gradient(circle_at_20%_30%,#F04A50_0,transparent_45%),radial-gradient(circle_at_80%_70%,#A50F15_0,transparent_50%)]" />
          )}
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold text-[#171717]">
            <span className="size-1.5 rounded-full bg-[#22C55E]" />Opening soon on DOORS
          </span>
        </div>
        <div className="relative px-4 pb-4">
          <div className="-mt-8 flex items-end gap-3">
            <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-[#F7F7F7] bg-[#171717] text-lg font-extrabold text-white">
              {logoUrl ? <img src={logoUrl} alt="" className="size-full object-cover" /> : initials}
            </span>
          </div>
          <h3 className="mt-2 break-words font-display text-xl font-extrabold leading-tight text-[#171717]">{display}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs font-semibold text-[#737373]">
            <span>{category || "Category"}</span><span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-0.5"><Star aria-hidden="true" className="size-3 fill-[#F5A524] text-[#F5A524]" />New</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-[#525252]">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1"><Clock aria-hidden="true" className="size-3" />{hours?.trim() || "Opening hours"}</span>
            {landmark?.trim() ? <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-white px-2 py-1"><MapPin aria-hidden="true" className="size-3 shrink-0" /><span className="truncate">{landmark}</span></span> : null}
          </div>
          {description.trim() ? <p className="mt-2 line-clamp-3 text-xs text-[#525252]">{description}</p> : null}
          <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-[#171717]">Menu</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(shown.length ? shown : [{ key: -1, name: "", price: "", photo: null }, { key: -2, name: "", price: "", photo: null }]).map((p) => <PreviewProduct key={p.key} name={p.name} price={p.price} photo={p.photo} />)}
          </div>
        </div>
      </div>
      {!demo ? <p className="mt-3 text-center text-xs text-white/50">A preview only. Your real store is set up with you after approval.</p> : null}
    </div>
  )
}

function PreviewProduct({ name, price, photo }: { name: string; price: string; photo: File | null }) {
  const url = useObjectUrl(photo)
  const amount = Number(price.replace(/,/g, ""))
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <div className="relative flex aspect-[4/3] items-center justify-center bg-[#FDEAEA]">
        {url ? <img src={url} alt="" className="size-full object-cover" /> : <Image src="/brand/doors-mark-white.png" alt="" width={385} height={279} className="w-8 opacity-90 [filter:brightness(0)_saturate(100%)_invert(19%)_sepia(93%)_saturate(4000%)_hue-rotate(350deg)]" />}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-bold text-[#171717]">{name.trim() || "Product name"}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs font-extrabold text-[#D71920]">{Number.isFinite(amount) && amount > 0 ? `₦${amount.toLocaleString("en-NG")}` : "₦ —"}</span>
          <span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full bg-[#171717] text-white"><Plus className="size-3" /></span>
        </div>
      </div>
    </div>
  )
}
