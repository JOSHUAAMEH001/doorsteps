"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Lock } from "lucide-react"
import { finalizeApplicationFiles, submitRiderApplication } from "@/app/actions/recruit"
import { uploadApplicationFiles, type PendingFile } from "@/lib/recruit-upload"
import { Check18, Chips, Field, FilePick, FormAlert, Sheet, SheetHeader, Stepper, SubmitButton, inputClass } from "@/components/landing/form-ui"
import { ShareDoors } from "@/components/landing/waitlist-form"

const STEPS = ["About you", "Vehicle", "Safety & documents"]
type Vehicle = "bicycle" | "motorcycle" | "other"
type Avail = "Full-time" | "Part-time" | "Evenings" | "Weekends"

const PHONE = /^(0|\+?234)?[789][01]\d{8}$/
const clean = (v: string) => v.replace(/[\s-]/g, "")

export function RiderFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} label="Apply to ride with DOORS">
      {open ? <RiderFlowBody onClose={onClose} /> : null}
    </Sheet>
  )
}

function RiderFlowBody({ onClose }: { onClose: () => void }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [f, setF] = useState({
    full_name: "", phone: "", whatsapp: "", email: "", residential_area: "", is_adult: false,
    vehicle_type: "" as Vehicle | "", availability: "" as Avail | "", experience: "",
    emergency_name: "", emergency_phone: "", consent: false,
  })
  const [idDoc, setIdDoc] = useState<File | null>(null)
  const [licence, setLicence] = useState<File | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [alert, setAlert] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [done, setDone] = useState<null | { duplicate: boolean; failed: number }>(null)
  const motorised = f.vehicle_type === "motorcycle"

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }))
  useEffect(() => { scroller.current?.scrollTo({ top: 0, behavior: "smooth" }) }, [step])

  function validate(s: number) {
    const e: Record<string, string> = {}
    if (s === 0) {
      if (f.full_name.trim().length < 2) e.full_name = "Enter your full name."
      if (!PHONE.test(clean(f.phone))) e.phone = "Enter a valid Nigerian phone number."
      if (f.whatsapp && !PHONE.test(clean(f.whatsapp))) e.whatsapp = "Enter a valid number or leave it blank."
      if (f.email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(f.email.trim())) e.email = "Check your email address."
      if (f.residential_area.trim().length < 2) e.residential_area = "Tell us where you live."
      if (!f.is_adult) e.is_adult = "You must be 18 or older to ride with DOORS."
    }
    if (s === 1) {
      if (!f.vehicle_type) e.vehicle_type = "Choose your vehicle type."
      if (!f.availability) e.availability = "Choose when you can work."
    }
    if (s === 2) {
      if (f.emergency_name.trim().length < 2) e.emergency_name = "Enter an emergency contact name."
      if (!PHONE.test(clean(f.emergency_phone))) e.emergency_phone = "Enter a valid phone number."
      else if (clean(f.emergency_phone).slice(-10) === clean(f.phone).slice(-10)) e.emergency_phone = "Use someone else's number."
      if (!f.consent) e.consent = "Please agree so we can review your application."
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setAlert(null)
    if (step < STEPS.length - 1) { if (validate(step)) setStep((s) => s + 1); return }
    if (busy || !validate(2)) return
    setBusy(true)
    try {
      const res = await submitRiderApplication({ ...f })
      if (!res.ok) {
        if (res.field) {
          setErrors({ [res.field]: res.error ?? "Check this field." })
          setStep(["full_name", "phone", "whatsapp", "email", "residential_area", "is_adult"].includes(res.field) ? 0 : ["vehicle_type", "availability"].includes(res.field) ? 1 : 2)
        }
        setAlert(res.error ?? "We couldn't save your application. Please try again.")
        return
      }
      let failed = 0
      if (res.id) {
        const files: PendingFile[] = []
        if (idDoc) files.push({ label: "id-document", file: idDoc })
        if (licence && motorised) files.push({ label: "drivers-licence", file: licence })
        if (photo) files.push({ label: "profile-photo", file: photo })
        if (files.length) {
          setProgress(`Uploading documents securely 0/${files.length}…`)
          failed = await uploadApplicationFiles("rider", res.id, files, (d, t) => setProgress(`Uploading documents securely ${d}/${t}…`))
          await finalizeApplicationFiles("rider", res.id)
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
            <h3 className="font-display text-2xl font-extrabold tracking-tight">{done.duplicate ? "We already have your application" : "Thanks for applying to ride with DOORS!"}</h3>
            <p className="text-sm text-[#525252]">
              {done.duplicate ? "An application with this phone number was already submitted. We'll be in touch if you're shortlisted." : "We review every application. Shortlisted riders will be contacted for a short screening before launch."}
            </p>
            {done.failed > 0 ? <p className="rounded-2xl bg-[#FFF6E5] px-4 py-3 text-sm font-medium text-[#8A5A00]">Your application was saved, but {done.failed} document{done.failed > 1 ? "s" : ""} didn&apos;t upload. You can bring {done.failed > 1 ? "them" : "it"} to your screening.</p> : null}
            <div className="w-full pt-2"><ShareDoors text="DOORS is recruiting delivery riders around ESUT and Agbani. Apply here:" /></div>
            <button type="button" onClick={onClose} className="text-sm font-bold text-[#171717] underline underline-offset-4">Back to DOORS</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <SheetHeader title="Apply as a rider" subtitle="About 2 minutes" onClose={onClose}><Stepper steps={STEPS} current={step} /></SheetHeader>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
        <form id="rider-form" onSubmit={(e) => void submit(e)} noValidate className="relative flex flex-col gap-5">
          {step === 0 ? (
            <>
              <Field label="Full name" error={errors.full_name}><input value={f.full_name} onChange={set("full_name")} autoComplete="name" aria-invalid={Boolean(errors.full_name)} className={inputClass} autoFocus /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone number" error={errors.phone}><input type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} aria-invalid={Boolean(errors.phone)} placeholder="0803 000 0000" className={inputClass} /></Field>
                <Field label="WhatsApp number" optional error={errors.whatsapp}><input type="tel" inputMode="tel" value={f.whatsapp} onChange={set("whatsapp")} placeholder="If different" className={inputClass} /></Field>
              </div>
              <Field label="Email address" optional error={errors.email}><input type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set("email")} className={inputClass} /></Field>
              <Field label="Where do you live?" error={errors.residential_area}><input value={f.residential_area} onChange={set("residential_area")} maxLength={120} aria-invalid={Boolean(errors.residential_area)} placeholder="Your area or street" className={inputClass} /></Field>
              <Check18 checked={f.is_adult} onChange={(v) => setF((s) => ({ ...s, is_adult: v }))} error={errors.is_adult}>I confirm I am <strong>18 years or older</strong>.</Check18>
            </>
          ) : null}
          {step === 1 ? (
            <>
              <Chips<Vehicle> label="Vehicle type" value={f.vehicle_type} onChange={(v) => setF((s) => ({ ...s, vehicle_type: v }))} error={errors.vehicle_type}
                options={[{ value: "bicycle", label: "🚲 Bicycle" }, { value: "motorcycle", label: "🏍️ Motorcycle" }, { value: "other", label: "Other" }]} />
              <Chips<Avail> label="When can you deliver?" value={f.availability} onChange={(v) => setF((s) => ({ ...s, availability: v }))} error={errors.availability}
                options={[{ value: "Full-time", label: "Full-time" }, { value: "Part-time", label: "Part-time" }, { value: "Evenings", label: "Evenings" }, { value: "Weekends", label: "Weekends" }]} />
              <Field label="Delivery experience" optional hint="e.g. 1 year with a dispatch company, or none — that's fine.">
                <textarea rows={3} value={f.experience} onChange={set("experience")} maxLength={500} className={inputClass} />
              </Field>
            </>
          ) : null}
          {step === 2 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Emergency contact name" error={errors.emergency_name}><input value={f.emergency_name} onChange={set("emergency_name")} aria-invalid={Boolean(errors.emergency_name)} className={inputClass} /></Field>
                <Field label="Emergency contact phone" error={errors.emergency_phone}><input type="tel" inputMode="tel" value={f.emergency_phone} onChange={set("emergency_phone")} aria-invalid={Boolean(errors.emergency_phone)} className={inputClass} /></Field>
              </div>
              <div className="rounded-3xl border border-[#E7E7E7] bg-white p-4">
                <p className="flex items-start gap-2 text-sm text-[#404040]"><Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#1F9D55]" /><span><strong>Why we ask for documents:</strong> to confirm who you are and keep customers safe. They&apos;re stored privately: only the DOORS admin team can see them, and they&apos;re never made public. If you don&apos;t have them now, you can bring them to screening.</span></p>
                <div className="mt-4 grid gap-4">
                  <FilePick label="Government ID (NIN slip, voter's card, passport…)" allowPdf file={idDoc} onChange={setIdDoc} onError={setAlert} />
                  {motorised ? <FilePick label="Driver's licence" allowPdf file={licence} onChange={setLicence} onError={setAlert} /> : null}
                  <FilePick label="Profile photo" file={photo} onChange={setPhoto} onError={setAlert} hint="A clear photo of your face" />
                </div>
              </div>
              <Check18 checked={f.consent} onChange={(v) => setF((s) => ({ ...s, consent: v }))} error={errors.consent}>
                I confirm my details are correct and agree that DOORS may store them and my documents to review my application and contact me. See our <a href="/privacy" target="_blank" className="font-semibold underline">privacy notice</a>.
              </Check18>
            </>
          ) : null}
          <FormAlert message={alert} />
        </form>
      </div>
      <div className="shrink-0 border-t border-[#EAEAEA] bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-7">
        {progress ? <p role="status" className="mb-2 text-center text-xs font-semibold text-[#525252]">{progress}</p> : null}
        <div className="flex gap-3">
          {step > 0 ? <button type="button" onClick={() => { setAlert(null); setStep((s) => s - 1) }} className="inline-flex min-h-13 items-center gap-2 rounded-2xl bg-[#F3F3F3] px-5 text-sm font-bold text-[#171717]"><ArrowLeft aria-hidden="true" className="size-4" />Back</button> : null}
          {step < STEPS.length - 1 ? (
            <button type="submit" form="rider-form" className="inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#171717] px-5 text-[15px] font-extrabold text-white active:scale-[0.98]">Continue<ArrowRight aria-hidden="true" className="size-4" /></button>
          ) : (
            <SubmitButton busy={busy} form="rider-form" className="flex-1">{busy ? "Submitting…" : "Submit application"}</SubmitButton>
          )}
        </div>
      </div>
    </>
  )
}
