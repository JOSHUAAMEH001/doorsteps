"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Phone, MessageCircle, MapPin } from "lucide-react"
import { useApp } from "@/lib/store"
import { ScreenHeader, Rating } from "@/components/app/ui"
import { orderStatusSteps } from "@/lib/data"
import { cn } from "@/lib/utils"

export function TrackingScreen() {
  const { navigate } = useApp()
  // active step index across the confirmed -> preparing -> on_the_way -> delivered flow
  const [step, setStep] = useState(1)
  const [eta, setEta] = useState(15)

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStep((s) => (s < orderStatusSteps.length - 1 ? s + 1 : s))
    }, 4500)
    const etaTimer = setInterval(() => {
      setEta((e) => (e > 1 ? e - 1 : e))
    }, 3000)
    return () => {
      clearInterval(stepTimer)
      clearInterval(etaTimer)
    }
  }, [])

  const delivered = step >= orderStatusSteps.length - 1

  return (
    <div className="flex min-h-full flex-col bg-background">
      <ScreenHeader title="Track order" subtitle="Order DL-4821" />

      {/* Map */}
      <div className="relative h-56 w-full overflow-hidden">
        <Image
          src="/map-route.png"
          alt="Live delivery route map"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/30" />
        {/* animated rider marker */}
        <div
          className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg shadow-brand/40 transition-all duration-1000"
          style={{
            transform: `translate(calc(-50% + ${step * 8}px), calc(-50% - ${step * 10}px))`,
          }}
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/40" />
          <MapPin className="relative h-5 w-5" />
        </div>
      </div>

      <div className="flex-1 space-y-4 p-5">
        {/* ETA card */}
        <div className="flex items-center justify-between rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {delivered ? "Order status" : "Estimated arrival"}
            </p>
            <p className="text-2xl font-extrabold text-foreground">
              {delivered ? "Delivered" : `${eta} mins`}
            </p>
          </div>
          <div className="rounded-full bg-brand-soft px-4 py-2 text-xs font-bold text-brand">
            {orderStatusSteps[step].label}
          </div>
        </div>

        {/* Rider card */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Image
              src="/rider-avatar.png"
              alt="Rider Emeka"
              width={52}
              height={52}
              className="h-13 w-13 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">Emeka Okafor</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Your rider</span>
                <span aria-hidden>•</span>
                <Rating value={4.9} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Message rider"
                onClick={() => navigate("support")}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground transition-transform active:scale-90"
              >
                <MessageCircle className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Call rider"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-brand-foreground transition-transform active:scale-90"
              >
                <Phone className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mt-3 rounded-2xl bg-secondary p-3 text-xs text-muted-foreground">
            Riding a red Doorsteps bike • Plate ENU-482-KJA
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-foreground">Order progress</h2>
          <ol className="space-y-0">
            {orderStatusSteps.map((s, i) => {
              const done = i < step
              const active = i === step
              const isLast = i === orderStatusSteps.length - 1
              return (
                <li key={s.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors",
                        done && "border-brand bg-brand text-brand-foreground",
                        active && "border-brand bg-brand-soft text-brand",
                        !done && !active && "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    {!isLast && (
                      <span
                        className={cn(
                          "my-1 w-0.5 flex-1 rounded-full transition-colors",
                          done ? "bg-brand" : "bg-border",
                        )}
                        style={{ minHeight: 28 }}
                      />
                    )}
                  </div>
                  <div className={cn("pb-4", isLast && "pb-0")}>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        active || done ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}
