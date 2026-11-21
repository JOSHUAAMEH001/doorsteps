"use client"

import { useState, type FormEvent } from "react"
import useSWR from "swr"
import { getFormOptions } from "@/app/actions/form-options"
import { CheckCircle2, Copy, Share2 } from "lucide-react"
import { submitWaitlist } from "@/app/actions/recruit"
import { Chips, Field, FormAlert, SubmitButton, inputClass } from "@/components/landing/form-ui"

type Service = "food" | "groceries" | "both"

export function WaitlistForm() {
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", area: "", areaOther: "", service: "" as Service | "", whatsapp: "", favourite: "", comments: "" })
  const [more, setMore] = useState(false)
  // Areas are managed by DOORS admins (Admin → Pre-launch sign-ups → Form choices). "Other" is always offered.
  const { data: options } = useSWR("form-options", getFormOptions, { revalidateOnFocus: false })
  const areas = [...(options?.waitlist_areas ?? []), "Other"]
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErr, setFieldErr] = useState<{ field?: string; msg?: string }>({})
  const [done, setDone] = useState<null | { duplicate: boolean; name: string }>(null)

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const err = (f: string) => (fieldErr.field === f ? fieldErr.msg : null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    setFieldErr({})
    const area = form.area === "Other" ? form.areaOther.trim() : form.area
    if (!form.service) { setFieldErr({ field: "service", msg: "Choose food, groceries or both." }); return }
    if (!area) { setFieldErr({ field: "area", msg: "Tell us where you are." }); return }
    setBusy(true)
    try {
      const res = await submitWaitlist(
        { full_name: form.full_name, phone: form.phone, email: form.email, area, service: form.service, whatsapp: form.whatsapp, favourite: form.favourite, comments: form.comments },
      )
      if (res.ok) setDone({ duplicate: Boolean(res.duplicate), name: form.full_name.trim().split(" ")[0] })
      else if (res.field) setFieldErr({ field: res.field, msg: res.error })
      else setError(res.error ?? "We couldn't save your details. Please try again.")
    } catch {
      setError("You seem to be offline. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  if (done) return <WaitlistSuccess duplicate={done.duplicate} name={done.name} />

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="relative flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={err("full_name")}>
          <input required autoComplete="name" value={form.full_name} onChange={set("full_name")} aria-invalid={Boolean(err("full_name"))} placeholder="e.g. Chiamaka Okafor" className={inputClass} />
        </Field>
        <Field label="Phone number" error={err("phone")}>
          <input required type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} aria-invalid={Boolean(err("phone"))} placeholder="0803 000 0000" className={inputClass} />
        </Field>
      </div>
      <Field label="Email address" optional error={err("email")}>
        <input type="email" inputMode="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={Boolean(err("email"))} placeholder="you@example.com" className={inputClass} />
      </Field>
      <Field label="Where are you around ESUT / Agbani?" error={err("area")}>
        <select value={form.area} onChange={set("area")} aria-invalid={Boolean(err("area"))} className={inputClass}>
          <option value="">Choose your area</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </Field>
      {form.area === "Other" ? (
        <Field label="Your area">
          <input value={form.areaOther} onChange={set("areaOther")} placeholder="Type your area" className={inputClass} />
        </Field>
      ) : null}
      <Chips<Service>
        label="What will you order?"
        value={form.service}
        onChange={(v) => setForm((f) => ({ ...f, service: v }))}
        error={err("service")}
        options={[{ value: "food", label: "🍲 Food" }, { value: "groceries", label: "🛒 Groceries" }, { value: "both", label: "✨ Both" }]}
      />
      {more ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp number" optional error={err("whatsapp")}>
            <input type="tel" inputMode="tel" value={form.whatsapp} onChange={set("whatsapp")} placeholder="If different from phone" className={inputClass} />
          </Field>
          <Field label="Favourite food or vendor" optional>
            <input value={form.favourite} onChange={set("favourite")} maxLength={120} placeholder="e.g. Jollof & chicken" className={inputClass} />
          </Field>
          <Field label="Anything else?" optional className="sm:col-span-2">
            <textarea rows={2} value={form.comments} onChange={set("comments")} maxLength={500} placeholder="What would make DOORS perfect for you?" className={inputClass} />
          </Field>
        </div>
      ) : (
        <button type="button" onClick={() => setMore(true)} className="self-start text-sm font-bold text-[#D71920] underline-offset-4 hover:underline">+ Add WhatsApp, favourite food or a comment (optional)</button>
      )}
      <FormAlert message={error} />
      <SubmitButton busy={busy} className="w-full">{busy ? "Joining…" : "Join the waitlist"}</SubmitButton>
      <p className="text-center text-xs text-[#737373]">We&apos;ll only use your details to tell you about DOORS. <a href="/privacy" className="font-semibold underline underline-offset-2">Privacy</a></p>
    </form>
  )
}

export function ShareDoors({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== "undefined" ? `${window.location.origin}/join` : "https://doorsteps.com.ng/join"
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: "DOORS", text, url }); return } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* no clipboard */ }
  }
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button type="button" onClick={() => void share()} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#171717] px-5 text-sm font-bold text-white active:scale-[0.98]">
        {copied ? <Copy aria-hidden="true" className="size-4" /> : <Share2 aria-hidden="true" className="size-4" />}
        {copied ? "Link copied!" : "Share DOORS"}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1FAF5A] px-5 text-sm font-bold text-white active:scale-[0.98]"
      >
        Share on WhatsApp
      </a>
    </div>
  )
}

function WaitlistSuccess({ duplicate, name }: { duplicate: boolean; name: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 py-4 text-center [animation:landing-rise_.4s_ease-out]">
      <span className="flex size-16 items-center justify-center rounded-full bg-[#E8F7EE] text-[#1F9D55]"><CheckCircle2 aria-hidden="true" className="size-9" /></span>
      <div>
        <h3 className="font-display text-2xl font-extrabold tracking-tight text-[#171717]">{duplicate ? "You're already on the list!" : `You're in${name ? `, ${name}` : ""}! 🎉`}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#525252]">
          {duplicate ? "This phone number is already on the DOORS waitlist. We'll reach out before launch." : "You've joined the DOORS waitlist. We'll let you know as soon as ordering opens."}
        </p>
      </div>
      <p className="text-sm font-semibold text-[#171717]">More friends on DOORS means more vendors near you.</p>
      <div className="w-full"><ShareDoors text="I just joined the DOORS waitlist: food & groceries from local vendors around ESUT and Agbani, delivered." /></div>
    </div>
  )
}
