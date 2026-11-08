"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

const TARGET_TIME = new Date("2026-12-01T00:00:00+01:00").getTime()

type Countdown = { days: number; hours: number; minutes: number; seconds: number }

function getCountdown(now: number): Countdown {
  const totalSeconds = Math.floor(Math.max(0, TARGET_TIME - now) / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

export default function CountdownClient() {
  const [mounted, setMounted] = useState(false)
  const [countdown, setCountdown] = useState<Countdown | null>(null)

  useEffect(() => {
    setMounted(true)
    setCountdown(getCountdown(Date.now()))
    const interval = window.setInterval(() => setCountdown(getCountdown(Date.now())), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const isLive = mounted && countdown !== null && Object.values(countdown).every((value) => value === 0)
  const units = countdown ? [["DAYS", countdown.days], ["HOURS", countdown.hours], ["MINUTES", countdown.minutes], ["SECONDS", countdown.seconds]] as const : []

  return (
    <main className="relative flex min-h-screen min-h-[100svh] overflow-hidden flex-col items-center justify-center bg-[#ee0000] px-5 py-16 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-3 overflow-hidden text-center text-[clamp(4.5rem,22vw,15rem)] font-black leading-none tracking-[-0.08em] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.18)]">DOORS</div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[-1.25rem] overflow-hidden text-center text-[clamp(4.5rem,22vw,15rem)] font-black leading-none tracking-[-0.08em] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.18)]">DOORS</div>
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        <Image src="/doors-logo.png" alt="DOORS" width={260} height={112} priority className="mb-8 h-auto w-[min(58vw,260px)] object-contain" />
        <h1 className="max-w-xl text-balance text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">We launch on December 1st</h1>
        <div className="mt-9 min-h-[7.5rem] w-full">
          {isLive ? <p className="pt-8 text-3xl font-extrabold sm:text-5xl">We are live!</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4" aria-live="polite" aria-label="Launch countdown">
            {units.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/20 bg-white/15 px-3 py-4 shadow-lg backdrop-blur-sm sm:px-4 sm:py-5"><div className="text-4xl font-black tabular-nums tracking-[-0.06em] sm:text-6xl">{mounted ? String(value).padStart(2, "0") : "--"}</div><div className="mt-1 text-[0.65rem] font-extrabold tracking-[0.18em] text-white/85 sm:text-xs">{label}</div></div>)}
          </div>}
        </div>
        <p className="mt-8 text-sm font-semibold tracking-[0.16em] text-white/80 sm:text-base">Doorsteps Campus Logistics</p>
      </div>
    </main>
  )
}
