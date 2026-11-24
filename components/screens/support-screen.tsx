"use client"

import { ChevronDown, MessageCircle, Phone, Receipt } from "lucide-react"
import { ScreenHeader } from "@/components/app/ui"
import { useApp } from "@/lib/store"
import { CONTACT_PHONES } from "@/lib/contact"

/**
 * Help & support. DOORS has no live chat yet, so this screen connects customers to a real
 * person by phone instead of showing a chat that sends messages nowhere.
 */
const QUESTIONS = [
  {
    q: "Where is my order?",
    a: "Open Orders and tap your order to see its status. Once a rider picks it up, you can follow them on the map.",
  },
  {
    q: "I need to change my delivery address",
    a: "Call or WhatsApp us as soon as possible with your order number. We can usually change it before a rider picks up your order.",
  },
  {
    q: "I paid by bank transfer",
    a: "Make sure you used your order number as the transfer description. DOORS confirms transfers by hand, and your order goes to the restaurant once your payment is confirmed.",
  },
  {
    q: "Something is wrong with my order",
    a: "Call or WhatsApp us with your order number and tell us what happened. We'll sort it out with the restaurant or rider.",
  },
]

export function SupportScreen() {
  const { orders, navigate } = useApp()
  const latest = orders[0]

  return (
    <div className="flex min-h-full flex-col bg-background pb-10">
      <ScreenHeader title="Help & support" subtitle="Talk to a real person at DOORS" />

      <div className="flex flex-col gap-5 px-5 pt-2">
        <section aria-labelledby="call-title" className="rounded-3xl bg-brand p-5 text-brand-foreground">
          <h2 id="call-title" className="text-lg font-extrabold tracking-tight">Call or WhatsApp DOORS</h2>
          <p className="mt-1 text-sm text-brand-foreground/85">All our numbers are on WhatsApp. Have your order number ready.</p>
          <div className="mt-4 flex flex-col gap-2">
            {CONTACT_PHONES.map((ph) => (
              <div key={ph.tel} className="flex min-h-12 items-center gap-2 rounded-2xl bg-white py-1.5 pl-4 pr-1.5 text-foreground">
                <span className="flex-1 text-base font-extrabold tabular-nums">{ph.label}</span>
                <a
                  href={ph.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`WhatsApp ${ph.label}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#E8F7EE] px-3 text-sm font-bold text-[#167A43] active:scale-[0.97]"
                >
                  <MessageCircle aria-hidden="true" className="size-4" />WhatsApp
                </a>
                <a
                  href={`tel:${ph.tel}`}
                  aria-label={`Call ${ph.label}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-brand-soft px-3 text-sm font-bold text-brand active:scale-[0.97]"
                >
                  <Phone aria-hidden="true" className="size-4" />Call
                </a>
              </div>
            ))}
          </div>
        </section>

        {latest ? (
          <button
            type="button"
            onClick={() => navigate("tracking", { orderCode: latest.id, vendorId: latest.vendorId ?? undefined })}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary"><Receipt aria-hidden="true" className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted-foreground">Your latest order</span>
              <span className="block text-sm font-extrabold">{latest.id} · {latest.vendorName}</span>
            </span>
            <span className="text-xs font-bold text-brand">Track</span>
          </button>
        ) : null}

        <section aria-labelledby="faq-title">
          <h2 id="faq-title" className="mb-2 text-sm font-bold text-foreground">Common questions</h2>
          <div className="flex flex-col gap-2">
            {QUESTIONS.map((item) => (
              <details key={item.q} className="group rounded-2xl border border-border bg-card px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="pt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
