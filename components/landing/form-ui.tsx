"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { AlertCircle, Check, FileText, ImagePlus, Loader2, X } from "lucide-react"
import { checkFile } from "@/lib/recruit-upload"
import { cn } from "@/lib/utils"

export const inputClass =
  "mt-1.5 block w-full rounded-2xl border border-[#E4E4E4] bg-white px-4 py-3 text-[15px] text-[#171717] outline-none transition-[border-color,box-shadow] placeholder:text-[#A3A3A3] focus:border-[#D71920] focus:ring-4 focus:ring-[#D71920]/12 aria-[invalid=true]:border-[#D71920] aria-[invalid=true]:bg-[#FFF7F7]"

export function Field({ label, optional, hint, error, children, className }: { label: string; optional?: boolean; hint?: string; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block text-sm font-semibold text-[#171717]", className)}>
      <span className="flex items-baseline justify-between gap-2">
        <span>{label}{optional ? null : <span aria-hidden="true" className="text-[#D71920]"> *</span>}</span>
        {optional ? <span className="text-xs font-medium text-[#8A8A8A]">Optional</span> : null}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#D71920]"><AlertCircle aria-hidden="true" className="size-3.5" />{error}</span>
      ) : hint ? <span className="mt-1.5 block text-xs font-medium text-[#737373]">{hint}</span> : null}
    </label>
  )
}

/** Large tappable single-choice chips (radio group). */
export function Chips<T extends string>({ label, value, onChange, options, error, optional }: { label: string; value: T | ""; onChange: (v: T) => void; options: { value: T; label: string; hint?: string }[]; error?: string | null; optional?: boolean }) {
  const id = useId()
  return (
    <fieldset aria-describedby={error ? `${id}-err` : undefined}>
      <legend className="flex w-full items-baseline justify-between text-sm font-semibold text-[#171717]">
        <span>{label}{optional ? null : <span aria-hidden="true" className="text-[#D71920]"> *</span>}</span>
        {optional ? <span className="text-xs font-medium text-[#8A8A8A]">Optional</span> : null}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={cn(
                "min-h-11 rounded-2xl border px-4 py-2 text-left text-sm font-semibold transition-all active:scale-[0.97]",
                on ? "border-[#171717] bg-[#171717] text-white shadow-[0_6px_16px_-8px_rgb(23_23_23/0.6)]" : "border-[#E4E4E4] bg-white text-[#404040] hover:border-[#BDBDBD]",
              )}
            >
              <span className="flex items-center gap-1.5">{on ? <Check aria-hidden="true" className="size-3.5" /> : null}{o.label}</span>
              {o.hint ? <span className={cn("block text-[11px] font-medium", on ? "text-white/70" : "text-[#8A8A8A]")}>{o.hint}</span> : null}
            </button>
          )
        })}
      </div>
      {error ? <p id={`${id}-err`} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#D71920]"><AlertCircle aria-hidden="true" className="size-3.5" />{error}</p> : null}
    </fieldset>
  )
}

export function Check18({ checked, onChange, children, error }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; error?: string | null }) {
  return (
    <div>
      <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 text-sm text-[#404040] transition-colors", checked ? "border-[#171717]" : error ? "border-[#D71920]" : "border-[#E4E4E4]")}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[#D71920]" />
        <span>{children}</span>
      </label>
      {error ? <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#D71920]"><AlertCircle aria-hidden="true" className="size-3.5" />{error}</p> : null}
    </div>
  )
}

/** Photo / document picker. Opens the camera or gallery on phones. */
export function FilePick({ label, file, onChange, allowPdf = false, optional = true, hint, compact = false, onError }: { label: string; file: File | null; onChange: (f: File | null) => void; allowPdf?: boolean; optional?: boolean; hint?: string; compact?: boolean; onError: (msg: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const preview = useObjectUrl(file && file.type.startsWith("image/") ? file : null)
  return (
    <div>
      <p className="flex items-baseline justify-between text-sm font-semibold text-[#171717]">
        <span>{label}{optional ? null : <span aria-hidden="true" className="text-[#D71920]"> *</span>}</span>
        {optional ? <span className="text-xs font-medium text-[#8A8A8A]">Optional</span> : null}
      </p>
      <div className={cn("mt-1.5 flex items-center gap-3 rounded-2xl border border-dashed border-[#CFCFCF] bg-white p-3", compact && "p-2")}>
        <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F3F3F3] text-[#8A8A8A]", compact ? "size-11" : "size-14")}>
          {preview ? <img src={preview} alt="" className="size-full object-cover" /> : file ? <FileText aria-hidden="true" className="size-6" /> : <ImagePlus aria-hidden="true" className="size-6" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[#171717]">{file ? file.name : allowPdf ? "Photo or PDF" : "Add a photo"}</span>
          <span className="block text-xs text-[#8A8A8A]">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : hint ?? "Take one or choose from your phone"}</span>
        </span>
        {file ? (
          <button type="button" onClick={() => onChange(null)} aria-label={`Remove ${label}`} className="flex size-10 items-center justify-center rounded-xl text-[#737373] hover:bg-[#F3F3F3]"><X aria-hidden="true" className="size-4" /></button>
        ) : (
          <button type="button" onClick={() => ref.current?.click()} className="min-h-10 rounded-xl bg-[#171717] px-3.5 text-xs font-bold text-white active:scale-95">Choose</button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept={allowPdf ? "image/*,application/pdf" : "image/*"}
        className="sr-only"
        tabIndex={-1}
        aria-label={label}
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (!f) return
          const problem = checkFile(f, allowPdf)
          if (problem) onError(problem)
          else onChange(f)
        }}
      />
    </div>
  )
}

/** Local preview URL for a picked file; revoked automatically. */
export function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) { setUrl(null); return }
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol aria-label="Progress" className="flex items-center gap-2">
      {steps.map((s, i) => (
        <li key={s} className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className={cn("h-1.5 rounded-full transition-colors duration-500", i <= current ? "bg-[#D71920]" : "bg-[#E7E7E7]")} />
          <span className={cn("truncate text-[11px] font-bold", i === current ? "text-[#171717]" : "text-[#9A9A9A]")} aria-current={i === current ? "step" : undefined}>{i + 1}. {s}</span>
        </li>
      ))}
    </ol>
  )
}

export function SubmitButton({ busy, children, className, disabled, form }: { busy: boolean; children: ReactNode; className?: string; disabled?: boolean; form?: string }) {
  return (
    <button
      type="submit"
      form={form}
      disabled={busy || disabled}
      className={cn("inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#D71920] px-6 text-[15px] font-extrabold text-white shadow-[0_12px_24px_-12px_rgb(215_25_32/0.8)] transition-all hover:bg-[#BF141B] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70", className)}
    >
      {busy ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : null}
      {children}
    </button>
  )
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl bg-[#FDEAEA] px-4 py-3 text-sm font-semibold text-[#A50F15]">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{message}
    </p>
  )
}

/** Hidden honeypot: real people never see or fill it. */
export function Trap({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>Company website<input tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} name="company_website" /></label>
    </div>
  )
}

/** Full-screen sheet on phones, large dialog on desktop. Locks page scroll; Esc closes. */
export function Sheet({ open, onClose, label, children, wide = false }: { open: boolean; onClose: () => void; label: string; children: ReactNode; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    panel.current?.focus()
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey) }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#0B0B0B]/60 backdrop-blur-[2px] [animation:landing-fade_.25s_ease-out]" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          "relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#F7F7F7] outline-none [animation:landing-rise_.35s_cubic-bezier(.2,.8,.2,1)] sm:h-auto sm:max-h-[92dvh] sm:rounded-[28px] sm:shadow-2xl",
          wide ? "sm:max-w-6xl" : "sm:max-w-2xl",
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children?: ReactNode }) {
  return (
    <div className="shrink-0 border-b border-[#EAEAEA] bg-white px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-tight text-[#171717] sm:text-2xl">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-[#6B6B6B]">{subtitle}</p> : null}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#F3F3F3] text-[#171717] hover:bg-[#EAEAEA]"><X aria-hidden="true" className="size-5" /></button>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}
