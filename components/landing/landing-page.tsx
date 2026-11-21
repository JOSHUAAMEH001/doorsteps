"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  ArrowRight, Bike, Check, ChevronDown, Clock, MapPin, Menu, Package, ShoppingBasket, Sparkles, Store, UtensilsCrossed, Users, X,
} from "lucide-react"
import { BrandLogo } from "@/components/brand/logo"
import { RiderIllustration } from "@/components/landing/rider-illustration"
import { WaitlistForm } from "@/components/landing/waitlist-form"
import { StorefrontPreview, VendorFlow } from "@/components/landing/vendor-flow"
import { RiderFlow } from "@/components/landing/rider-flow"
import { cn } from "@/lib/utils"

const LAUNCH = new Date("2026-12-06T00:00:00+01:00").getTime()
type Flow = "vendor" | "rider" | null

/* ---------------------------------------------------------------- shared --- */

/** Window-style card header. The three dots take the card's own colour family. */
const DOTS = {
  red: ["#FFB3B6", "#F04A50", "#A50F15"],
  dark: ["#5C5C5C", "#8A8A8A", "#D71920"],
  light: ["#D4D4D4", "#A3A3A3", "#171717"],
  blue: ["#BFD0FF", "#6E93FF", "#1F4FD8"],
} as const
function Chrome({ tone, label, className }: { tone: keyof typeof DOTS; label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {DOTS[tone].map((c) => <span key={c} aria-hidden="true" className="size-2.5 rounded-full" style={{ background: c }} />)}
      {label ? <span className="ml-2 text-[11px] font-bold uppercase tracking-[0.16em] opacity-70">{label}</span> : null}
    </div>
  )
}

function Eyebrow({ children, tone = "red" }: { children: ReactNode; tone?: "red" | "light" | "blue" }) {
  return (
    <p className={cn(
      "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em]",
      tone === "red" && "bg-[#FDEAEA] text-[#D71920]",
      tone === "light" && "bg-white/10 text-white",
      tone === "blue" && "bg-white/15 text-white",
    )}>{children}</p>
  )
}

function Cta({ children, onClick, href, variant = "red", className }: { children: ReactNode; onClick?: () => void; href?: string; variant?: "red" | "dark" | "ghost" | "white"; className?: string }) {
  const cls = cn(
    "group inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl px-6 text-[15px] font-extrabold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
    variant === "red" && "bg-[#D71920] text-white shadow-[0_14px_28px_-14px_rgb(215_25_32/0.9)] hover:bg-[#BF141B]",
    variant === "dark" && "bg-[#171717] text-white hover:bg-black",
    variant === "ghost" && "border-2 border-[#171717] text-[#171717] hover:bg-[#171717] hover:text-white",
    variant === "white" && "bg-white text-[#171717] hover:bg-[#F3F3F3]",
    className,
  )
  const inner = <>{children}<ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" /></>
  return href ? <a href={href} className={cls}>{inner}</a> : <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

function useCountdown() {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (now === null) return null
  const ms = Math.max(0, LAUNCH - now)
  return { days: Math.floor(ms / 864e5), hours: Math.floor(ms / 36e5) % 24, minutes: Math.floor(ms / 6e4) % 60, seconds: Math.floor(ms / 1e3) % 60, live: ms === 0 }
}

/* ------------------------------------------------------------------ page --- */

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null)
  const [flow, setFlow] = useState<Flow>(null)
  const [vendorName, setVendorName] = useState("")

  const open = useCallback((f: Exclude<Flow, null>) => {
    setFlow(f)
    history.replaceState(null, "", `#apply-${f}`)
  }, [])
  const close = useCallback(() => {
    setFlow(null)
    if (location.hash.startsWith("#apply-")) history.replaceState(null, "", location.pathname)
  }, [])
  const toWaitlist = useCallback(() => {
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  // Deep links: /join#apply-vendor, /join#apply-rider
  useEffect(() => {
    const sync = () => {
      if (location.hash === "#apply-vendor") setFlow("vendor")
      else if (location.hash === "#apply-rider") setFlow("rider")
    }
    sync()
    window.addEventListener("hashchange", sync)
    return () => window.removeEventListener("hashchange", sync)
  }, [])

  // Motion. Everything is skipped for people who prefer reduced motion.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from("[data-hero-line]", { yPercent: 105, opacity: 0, duration: 0.9, ease: "power4.out", stagger: 0.09 })
      gsap.from("[data-hero-fade]", { y: 18, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.08, delay: 0.35 })
      gsap.from(".hero-art", { scale: 0.92, opacity: 0, duration: 1, ease: "back.out(1.4)", delay: 0.15 })

      gsap.to(".bike-wheel-back", { rotation: 360, svgOrigin: "170 396", repeat: -1, ease: "none", duration: 0.9 })
      gsap.to(".bike-wheel-front", { rotation: 360, svgOrigin: "424 396", repeat: -1, ease: "none", duration: 0.9 })
      gsap.to(".bike-body", { y: -3, duration: 0.28, yoyo: true, repeat: -1, ease: "sine.inOut" })
      gsap.to(".rider-head", { rotation: 3, svgOrigin: "300 190", duration: 1.6, yoyo: true, repeat: -1, ease: "sine.inOut" })
      gsap.fromTo(".speed-line", { x: 30, opacity: 0 }, { x: -40, opacity: 1, duration: 0.9, repeat: -1, stagger: 0.22, ease: "power1.in" })
      gsap.utils.toArray<SVGGElement>(".float-item").forEach((el, i) => {
        gsap.to(el, { y: i % 2 ? 10 : -12, rotation: i % 2 ? 3 : -3, transformOrigin: "50% 50%", duration: 2.2 + i * 0.45, yoyo: true, repeat: -1, ease: "sine.inOut" })
      })
      gsap.to(".hero-chip", { y: -8, duration: 2.6, yoyo: true, repeat: -1, ease: "sine.inOut", stagger: 0.7 })

      // Marquee: seamless loop of a duplicated track.
      gsap.to(".marquee-track", { xPercent: -50, duration: 28, repeat: -1, ease: "none" })

      // Scroll reveals (no pinning, no scroll hijacking).
      gsap.set("[data-reveal]", { y: 36, opacity: 0 })
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 90%",
        once: true,
        onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", stagger: 0.09, overwrite: true }),
      })
      gsap.to(".route-dash", { strokeDashoffset: -48, duration: 1.8, repeat: -1, ease: "none" })
      gsap.from(".community-node", {
        scale: 0, transformOrigin: "50% 50%", duration: 0.6, ease: "back.out(2)", stagger: 0.12,
        scrollTrigger: { trigger: "#community", start: "top 70%", once: true },
      })
    })

    // Subtle parallax: the hero art leans toward the pointer (desktop only).
    const art = root.current?.querySelector<HTMLElement>(".hero-art")
    const hero = root.current?.querySelector<HTMLElement>("#home")
    let move: ((e: PointerEvent) => void) | null = null
    if (art && hero && window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) {
      const rx = gsap.quickTo(art, "rotationY", { duration: 0.8, ease: "power3.out" })
      const ry = gsap.quickTo(art, "rotationX", { duration: 0.8, ease: "power3.out" })
      move = (e) => {
        const r = hero.getBoundingClientRect()
        rx(((e.clientX - r.left) / r.width - 0.5) * 8)
        ry(-((e.clientY - r.top) / r.height - 0.5) * 6)
      }
      hero.addEventListener("pointermove", move)
    }
    return () => {
      if (move && hero) hero.removeEventListener("pointermove", move)
      mm.revert()
    }
  }, [])

  return (
    <div ref={root} className="min-h-dvh overflow-x-clip bg-white font-sans text-[#171717] selection:bg-[#D71920] selection:text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:font-bold">Skip to content</a>
      <Nav onWaitlist={toWaitlist} onVendor={() => open("vendor")} onRider={() => open("rider")} />
      <main id="main">
        <Hero onWaitlist={toWaitlist} onVendor={() => open("vendor")} onRider={() => open("rider")} />
        <Marquee />
        <Experience />
        <HowItWorks />
        <VendorSection name={vendorName} setName={setVendorName} onApply={() => open("vendor")} />
        <RiderSection onApply={() => open("rider")} />
        <Community />
        <Waitlist />
        <Faq />
        <FinalCta onWaitlist={toWaitlist} onVendor={() => open("vendor")} onRider={() => open("rider")} />
      </main>
      <Footer />
      <VendorFlow open={flow === "vendor"} onClose={close} initialName={vendorName} />
      <RiderFlow open={flow === "rider"} onClose={close} />
    </div>
  )
}

/* ------------------------------------------------------------------- nav --- */

const LINKS = [
  { href: "#home", label: "Home" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#vendors", label: "Vendors" },
  { href: "#riders", label: "Riders" },
  { href: "#about", label: "About DOORS" },
]

function Nav({ onWaitlist, onVendor, onRider }: { onWaitlist: () => void; onVendor: () => void; onRider: () => void }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey) }
  }, [open])

  return (
    <header className={cn("sticky top-0 z-50 transition-[background,box-shadow] duration-300", scrolled ? "bg-white/85 shadow-[0_1px_0_#EDEDED] backdrop-blur-xl" : "bg-transparent")}>
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:h-20 sm:px-6">
        <a href="#home" aria-label="DOORS home" className="shrink-0"><BrandLogo tone="red" priority className="h-7 sm:h-8" /></a>
        <ul className="ml-auto hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => <li key={l.href}><a href={l.href} className="rounded-xl px-3.5 py-2 text-sm font-bold text-[#404040] transition-colors hover:bg-[#F3F3F3] hover:text-[#171717]">{l.label}</a></li>)}
        </ul>
        <button type="button" onClick={onWaitlist} className="ml-auto hidden min-h-11 items-center rounded-2xl bg-[#D71920] px-5 text-sm font-extrabold text-white shadow-[0_10px_20px_-12px_rgb(215_25_32/0.9)] transition-transform hover:-translate-y-0.5 sm:inline-flex lg:ml-2">Join the waitlist</button>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="ml-auto flex size-11 items-center justify-center rounded-2xl bg-[#171717] text-white sm:ml-0 lg:hidden"><Menu aria-hidden="true" className="size-5" /></button>
      </nav>
      {open ? (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[70] flex flex-col bg-[#171717] text-white [animation:landing-fade_.2s_ease-out] lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <BrandLogo tone="white" className="h-7" />
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="flex size-11 items-center justify-center rounded-2xl bg-white/10"><X aria-hidden="true" className="size-5" /></button>
          </div>
          <ul className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pt-4">
            {LINKS.map((l, i) => (
              <li key={l.href} style={{ animation: `landing-rise .4s ${i * 0.05}s both` }}>
                <a href={l.href} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-2xl px-3 py-4 font-display text-3xl font-extrabold tracking-tight hover:bg-white/5">{l.label}<ArrowRight aria-hidden="true" className="size-5 text-[#D71920]" /></a>
              </li>
            ))}
          </ul>
          <div className="grid gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => { setOpen(false); onWaitlist() }} className="min-h-13 rounded-2xl bg-[#D71920] font-extrabold">Join the customer waitlist</button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setOpen(false); onVendor() }} className="min-h-13 rounded-2xl bg-white font-extrabold text-[#171717]">Become a vendor</button>
              <button type="button" onClick={() => { setOpen(false); onRider() }} className="min-h-13 rounded-2xl border-2 border-white/30 font-extrabold">Become a rider</button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}

/* ------------------------------------------------------------------ hero --- */

function Hero({ onWaitlist, onVendor, onRider }: { onWaitlist: () => void; onVendor: () => void; onRider: () => void }) {
  const c = useCountdown()
  return (
    <section id="home" className="relative -mt-16 overflow-hidden bg-[#F7F7F7] pt-16 sm:-mt-20 sm:pt-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(#171717_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.05]" />
      <div className="relative mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-6 px-4 pb-14 pt-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-24 lg:pt-14">
        <div>
          <div data-hero-fade><Eyebrow><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#D71920] opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-[#D71920]" /></span>Launching 6 December · ESUT &amp; Agbani</Eyebrow></div>
          <h1 className="mt-5 font-display text-[clamp(2.6rem,8.5vw,5.4rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
            <span className="block overflow-hidden pb-1"><span data-hero-line className="block">Agbani,</span></span>
            <span className="block overflow-hidden pb-1"><span data-hero-line className="block">something</span></span>
            <span className="block overflow-hidden pb-2"><span data-hero-line className="block"><span className="relative inline-block text-[#D71920]">better<svg aria-hidden="true" viewBox="0 0 200 12" className="absolute -bottom-1 left-0 w-full" preserveAspectRatio="none"><path d="M2 9 C50 2 150 2 198 8" stroke="#D71920" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.35" /></svg></span> is</span></span>
            <span className="block overflow-hidden pb-1"><span data-hero-line className="block">on the way.</span></span>
          </h1>
          <p data-hero-fade className="mt-5 max-w-xl text-lg leading-relaxed text-[#525252]">DOORS connects you to local food and grocery vendors around ESUT and Agbani, making everyday ordering more convenient.</p>
          <div data-hero-fade className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Cta onClick={onWaitlist}>Join the customer waitlist</Cta>
            <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:flex">
              <Cta onClick={onVendor} variant="dark">Become a vendor</Cta>
              <Cta onClick={onRider} variant="ghost">Become a rider</Cta>
            </div>
          </div>
          <div data-hero-fade className="mt-8 flex items-center gap-3" aria-live="off">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A8A8A]">Launch in</p>
            <div className="flex gap-1.5">
              {(["days", "hours", "minutes", "seconds"] as const).map((k) => (
                <span key={k} className="flex min-w-12 flex-col items-center rounded-xl bg-white px-2 py-1.5 shadow-[0_1px_0_#EAEAEA]">
                  <span className="font-display text-lg font-extrabold tabular-nums leading-none">{c ? String(c[k]).padStart(2, "0") : "--"}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#8A8A8A]">{{ days: "days", hours: "hrs", minutes: "min", seconds: "sec" }[k]}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative [perspective:1200px]">
          <div className="hero-art relative mx-auto w-full max-w-[620px] [transform-style:preserve-3d]">
            <RiderIllustration className="h-auto w-full drop-shadow-[0_30px_40px_rgb(215_25_32/0.12)]" />
            <div className="hero-chip absolute bottom-[2%] left-[2%] hidden rounded-2xl bg-white p-3 shadow-[0_18px_40px_-18px_rgb(23_23_23/0.35)] sm:block">
              <Chrome tone="light" />
              <p className="mt-2 flex items-center gap-2 text-sm font-extrabold"><UtensilsCrossed aria-hidden="true" className="size-4 text-[#D71920]" />Food</p>
              <p className="text-xs text-[#737373]">from local kitchens</p>
            </div>
            <div className="hero-chip absolute bottom-[6%] right-0 hidden rounded-2xl bg-[#171717] p-3 text-white shadow-[0_18px_40px_-18px_rgb(23_23_23/0.6)] sm:block">
              <Chrome tone="dark" />
              <p className="mt-2 flex items-center gap-2 text-sm font-extrabold"><ShoppingBasket aria-hidden="true" className="size-4 text-[#F04A50]" />Groceries</p>
              <p className="text-xs text-white/60">everyday essentials</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Marquee() {
  const words = ["Food", "Groceries", "Waybill", "Local vendors", "ESUT", "Agbani", "Delivered to your door"]
  const row = (k: string) => (
    <div key={k} className="flex shrink-0 items-center" aria-hidden={k === "b"}>
      {words.map((w) => <span key={w + k} className="flex items-center gap-6 px-6 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{w}<span className="size-2.5 rounded-full bg-[#D71920]" /></span>)}
    </div>
  )
  return (
    <div className="overflow-hidden bg-[#171717] py-5" role="presentation">
      <div className="marquee-track flex w-max">{row("a")}{row("b")}</div>
    </div>
  )
}

/* ------------------------------------------------------------ experience --- */

function Experience() {
  const cards = [
    { tone: "red" as const, label: "Food", title: "Food from kitchens you love", body: "Discover meals from local restaurants and food vendors around ESUT and Agbani.", icon: UtensilsCrossed, bg: "bg-[#D71920] text-white", art: <FoodArt /> },
    { tone: "dark" as const, label: "Groceries", title: "Groceries, sorted", body: "Get everyday essentials from local supermarkets and stores, without the trek.", icon: ShoppingBasket, bg: "bg-[#171717] text-white", art: <GroceryArt /> },
    { tone: "light" as const, label: "Delivery", title: "Delivered, conveniently", body: "Your order comes to you. Need to send a parcel? Our waybill service has you covered.", icon: Package, bg: "bg-[#F7F7F7] text-[#171717]", art: <DeliveryArt /> },
  ]
  return (
    <section id="about" aria-labelledby="exp-title" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div data-reveal className="max-w-2xl">
          <Eyebrow>The DOORS experience</Eyebrow>
          <h2 id="exp-title" className="mt-4 font-display text-[clamp(2rem,5vw,3.4rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">Everything you need, from people near you.</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {cards.map((c) => (
            <article key={c.label} data-reveal className={cn("group relative flex min-h-[420px] flex-col overflow-hidden rounded-[28px] p-6 transition-transform duration-300 hover:-translate-y-1.5 hover:rotate-[-0.6deg]", c.bg)}>
              <Chrome tone={c.tone} label={c.label} />
              <div className="flex flex-1 items-center justify-center py-6 transition-transform duration-500 group-hover:scale-105">{c.art}</div>
              <h3 className="font-display text-2xl font-extrabold tracking-tight">{c.title}</h3>
              <p className={cn("mt-2 text-[15px] leading-relaxed", c.tone === "light" ? "text-[#525252]" : "text-white/75")}>{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function FoodArt() {
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true" className="w-56">
      <ellipse cx="100" cy="128" rx="80" ry="10" fill="#000" opacity="0.15" />
      <ellipse cx="100" cy="108" rx="84" ry="26" fill="#fff" />
      <ellipse cx="100" cy="104" rx="64" ry="17" fill="#F2F2F2" />
      <path d="M48 104 C52 62 148 58 152 104 Z" fill="#F07B3F" />
      {[[70, 86], [92, 76], [116, 80], [132, 92], [84, 94], [106, 92]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="4" fill="#FFB27A" />)}
      <path d="M120 96 C134 60 172 62 168 84 C166 100 140 104 120 96 Z" fill="#8B4513" />
      <circle cx="62" cy="94" r="6" fill="#3FA34D" /><circle cx="80" cy="74" r="5" fill="#3FA34D" />
      <path d="M150 40 C150 30 160 24 166 32" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M134 34 C134 24 144 18 150 26" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.4" />
    </svg>
  )
}
function GroceryArt() {
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true" className="w-52">
      <ellipse cx="100" cy="138" rx="70" ry="8" fill="#000" opacity="0.4" />
      <path d="M70 52 L62 18 C61 10 72 8 74 16 L82 50" fill="#3FA34D" />
      <path d="M104 50 L118 10 C121 4 130 6 128 14 L116 52" fill="#F2C14E" />
      <circle cx="138" cy="44" r="16" fill="#D71920" /><path d="M138 28 L142 20" stroke="#3FA34D" strokeWidth="4" strokeLinecap="round" />
      <path d="M44 50 L156 50 L146 134 L54 134 Z" fill="#E6B57E" />
      <path d="M44 50 L156 50 L154 64 L46 64 Z" fill="#D39B5D" />
      <rect x="78" y="86" width="44" height="28" rx="7" fill="#171717" />
      <text x="100" y="105" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">D</text>
    </svg>
  )
}
function DeliveryArt() {
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true" className="w-56">
      <path d="M20 120 C60 80 110 140 180 60" stroke="#D71920" strokeWidth="4" strokeDasharray="2 10" strokeLinecap="round" fill="none" />
      <circle cx="20" cy="120" r="10" fill="#171717" /><circle cx="20" cy="120" r="4" fill="#fff" />
      <path d="M164 46 C164 34 172 26 182 26 C192 26 200 34 200 46 C200 60 182 76 182 76 C182 76 164 60 164 46 Z" fill="#D71920" transform="translate(-14 -6)" />
      <circle cx="168" cy="40" r="6" fill="#fff" />
      <rect x="70" y="54" width="62" height="52" rx="10" fill="#171717" />
      <rect x="70" y="54" width="62" height="14" rx="7" fill="#2B2B2B" />
      <rect x="70" y="86" width="62" height="6" fill="#D71920" />
      <path d="M96 68 L108 68 C113 68 116 72 116 77 C116 82 113 86 108 86 L96 86 Z" fill="#fff" />
    </svg>
  )
}

/* ---------------------------------------------------------- how it works --- */

const STEPS_HOW = [
  { title: "Explore local vendors", body: "Browse kitchens, supermarkets and stores near you.", icon: Store },
  { title: "Choose your food or groceries", body: "Add what you want to your cart in a few taps.", icon: UtensilsCrossed },
  { title: "Place your order", body: "Confirm your delivery spot and place your order.", icon: Check },
  { title: "Get it delivered", body: "A DOORS rider brings it to your door.", icon: Bike },
]

function HowItWorks() {
  const [step, setStep] = useState(0)
  const [auto, setAuto] = useState(true)
  const section = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = section.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!auto || !visible) return
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS_HOW.length), 3200)
    return () => clearInterval(t)
  }, [auto, visible])

  return (
    <section ref={section} id="how-it-works" aria-labelledby="how-title" className="bg-[#F7F7F7] py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <div data-reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 id="how-title" className="mt-4 font-display text-[clamp(2rem,5vw,3.4rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">Four taps from hungry to happy.</h2>
          </div>
          <ol className="mt-10 flex flex-col gap-3">
            {STEPS_HOW.map((s, i) => {
              const on = i === step
              const Icon = s.icon
              return (
                <li key={s.title} data-reveal>
                  <button
                    type="button"
                    onClick={() => { setAuto(false); setStep(i) }}
                    aria-pressed={on}
                    className={cn("relative flex w-full items-center gap-4 overflow-hidden rounded-3xl p-4 text-left transition-all duration-300", on ? "bg-white shadow-[0_18px_40px_-24px_rgb(23_23_23/0.4)]" : "hover:bg-white/60")}
                  >
                    <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-extrabold transition-colors", on ? "bg-[#D71920] text-white" : "bg-white text-[#171717]")}>{on ? <Icon aria-hidden="true" className="size-5" /> : i + 1}</span>
                    <span>
                      <span className="block font-display text-lg font-extrabold tracking-tight">{s.title}</span>
                      <span className={cn("block text-sm text-[#6B6B6B] transition-all", on ? "max-h-10 opacity-100" : "max-h-0 opacity-0 sm:max-h-10 sm:opacity-100")}>{s.body}</span>
                    </span>
                    {on && auto && visible ? <span key={step} aria-hidden="true" className="absolute bottom-0 left-0 h-1 bg-[#D71920] [animation:landing-progress_3.2s_linear_forwards]" /> : null}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
        <div data-reveal className="flex justify-center">
          <PhoneDemo step={step} />
        </div>
      </div>
    </section>
  )
}

function PhoneDemo({ step }: { step: number }) {
  return (
    <div className="relative">
      <div aria-hidden="true" className="absolute -inset-10 rounded-full bg-[#D71920]/10 blur-3xl" />
      <div className="relative w-[290px] rounded-[44px] bg-[#171717] p-3 shadow-[0_40px_80px_-30px_rgb(23_23_23/0.7)]">
        <div className="relative h-[560px] overflow-hidden rounded-[34px] bg-[#F7F7F7]">
          <div className="flex items-center justify-between px-5 pt-4 text-[11px] font-bold"><span>9:41</span><span className="rounded-full bg-[#171717] px-2 py-0.5 text-[9px] text-white">Illustration</span></div>
          <div key={step} className="px-4 pt-3 [animation:landing-rise_.45s_cubic-bezier(.2,.8,.2,1)]">
            {step === 0 ? <ScreenExplore /> : step === 1 ? <ScreenChoose /> : step === 2 ? <ScreenOrder /> : <ScreenDelivered />}
          </div>
        </div>
      </div>
    </div>
  )
}
function ScreenExplore() {
  const rows = [["Kitchen", "Rice, soups & swallow", "#D71920"], ["Supermarket", "Provisions & toiletries", "#171717"], ["Bakery", "Bread, pastries & snacks", "#F07B3F"], ["Drinks", "Smoothies & chilled drinks", "#3FA34D"]]
  return (
    <div>
      <BrandLogo tone="red" className="h-5" />
      <p className="mt-3 font-display text-xl font-extrabold leading-tight">What are you craving?</p>
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-xs text-[#A3A3A3]"><MapPin className="size-3.5 text-[#D71920]" />Delivering around ESUT</div>
      <div className="mt-3 flex flex-col gap-2">
        {rows.map(([t, s, c]) => (
          <div key={t} className="flex items-center gap-3 rounded-2xl bg-white p-2.5">
            <span className="size-11 shrink-0 rounded-xl" style={{ background: c }} />
            <div><p className="text-sm font-extrabold">{t}</p><p className="text-[11px] text-[#8A8A8A]">{s}</p></div>
          </div>
        ))}
      </div>
    </div>
  )
}
function ScreenChoose() {
  return (
    <div>
      <div className="h-32 rounded-3xl bg-[#D71920] p-3"><span className="rounded-full bg-white px-2 py-1 text-[10px] font-extrabold">Kitchen</span></div>
      <p className="mt-3 font-display text-lg font-extrabold">Popular</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[["Jollof rice", "#F07B3F", true], ["Fried rice", "#F2C14E", false], ["Egusi soup", "#3FA34D", false], ["Chapman", "#D71920", true]].map(([n, c, added]) => (
          <div key={n as string} className="rounded-2xl bg-white p-2">
            <span className="block h-14 rounded-xl" style={{ background: c as string, opacity: 0.85 }} />
            <p className="mt-1.5 text-xs font-bold">{n as string}</p>
            <span className={cn("mt-1 flex h-6 items-center justify-center rounded-lg text-[10px] font-extrabold", added ? "bg-[#171717] text-white" : "bg-[#F3F3F3]")}>{added ? "✓ Added" : "+ Add"}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-2xl bg-[#171717] px-4 py-3 text-xs font-extrabold text-white">View cart<span className="rounded-full bg-[#D71920] px-2 py-0.5">2</span></div>
    </div>
  )
}
function ScreenOrder() {
  return (
    <div>
      <p className="font-display text-xl font-extrabold">Checkout</p>
      <div className="mt-3 rounded-2xl bg-white p-3 text-xs">
        <p className="font-bold text-[#8A8A8A]">Deliver to</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-extrabold"><MapPin className="size-4 text-[#D71920]" />My hostel, ESUT</p>
      </div>
      <div className="mt-2 space-y-2 rounded-2xl bg-white p-3 text-xs">
        {["Jollof rice", "Chapman", "Delivery"].map((r) => <p key={r} className="flex justify-between"><span>{r}</span><span className="h-2.5 w-12 rounded-full bg-[#EDEDED]" /></p>)}
      </div>
      <div className="mt-24 flex h-12 items-center justify-center rounded-2xl bg-[#D71920] text-sm font-extrabold text-white shadow-[0_12px_24px_-12px_rgb(215_25_32/0.9)]">Place order</div>
    </div>
  )
}
function ScreenDelivered() {
  return (
    <div>
      <div className="relative h-56 overflow-hidden rounded-3xl bg-[#E9EEF5]">
        <svg viewBox="0 0 260 220" className="size-full" aria-hidden="true">
          <path d="M-10 160 C60 120 120 200 270 70" stroke="#fff" strokeWidth="22" fill="none" />
          <path d="M-10 160 C60 120 120 200 270 70" stroke="#D71920" strokeWidth="4" strokeDasharray="2 10" strokeLinecap="round" fill="none" />
          <circle cx="150" cy="150" r="14" fill="#171717" /><circle cx="150" cy="150" r="5" fill="#fff" />
          <path d="M222 74 C222 62 230 56 238 56 C246 56 254 62 254 74 C254 88 238 102 238 102 C238 102 222 88 222 74 Z" fill="#D71920" />
        </svg>
      </div>
      <p className="mt-3 font-display text-xl font-extrabold">Your rider is on the way</p>
      <div className="mt-2 flex gap-1.5">{[1, 1, 1, 0].map((on, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", on ? "bg-[#D71920]" : "bg-[#E2E2E2]")} />)}</div>
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3"><span className="flex size-10 items-center justify-center rounded-full bg-[#171717] text-white"><Bike className="size-5" /></span><div><p className="text-sm font-extrabold">DOORS rider</p><p className="text-[11px] text-[#8A8A8A]">Picked up · heading to you</p></div></div>
    </div>
  )
}

/* --------------------------------------------------------------- vendors --- */

function VendorSection({ name, setName, onApply }: { name: string; setName: (v: string) => void; onApply: () => void }) {
  const benefits = [
    ["Reach more local customers", "Students, staff and residents around ESUT and Agbani."],
    ["Get discovered online", "Your own storefront with your menu, photos and prices."],
    ["Receive orders through DOORS", "Accept orders from a simple vendor dashboard."],
    ["Grow with your community", "Be part of a local delivery network from day one."],
  ]
  return (
    <section id="vendors" aria-labelledby="vendor-title" className="relative overflow-hidden bg-[#171717] py-20 text-white sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-[#D71920]/25 blur-[120px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div data-reveal>
            <Eyebrow tone="light"><Store aria-hidden="true" className="size-3.5" />For vendors</Eyebrow>
            <h2 id="vendor-title" className="mt-4 font-display text-[clamp(2.1rem,5.4vw,3.8rem)] font-extrabold leading-[1] tracking-[-0.04em]">Your business deserves <span className="text-[#F04A50]">more customers.</span></h2>
            <p className="mt-5 max-w-xl text-lg text-white/70">DOORS is building a local platform that connects restaurants, food vendors, supermarkets and stores with customers around ESUT and Agbani.</p>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {benefits.map(([t, b]) => (
              <li key={t} data-reveal className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition-colors hover:border-[#D71920]/60 hover:bg-white/[0.07]">
                <span className="flex size-8 items-center justify-center rounded-xl bg-[#D71920]"><Check aria-hidden="true" className="size-4" /></span>
                <p className="mt-3 font-display text-lg font-extrabold leading-tight">{t}</p>
                <p className="mt-1 text-sm text-white/60">{b}</p>
              </li>
            ))}
          </ul>
          <div data-reveal className="mt-8 rounded-3xl bg-white p-2 sm:flex sm:items-center sm:gap-2">
            <label htmlFor="teaser-name" className="sr-only">Your business name</label>
            <input id="teaser-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Type your business name…" className="min-h-13 w-full flex-1 rounded-2xl bg-transparent px-4 text-[15px] font-semibold text-[#171717] outline-none placeholder:text-[#A3A3A3]" />
            <Cta onClick={onApply} className="w-full sm:w-auto">Register your business</Cta>
          </div>
          <p data-reveal className="mt-3 text-sm text-white/50">Free to apply. CAC registration isn&apos;t required for small vendors.</p>
        </div>
        <div data-reveal className="[perspective:1400px]">
          <div className="transition-transform duration-500 hover:[transform:rotateY(-6deg)_rotateX(3deg)]">
            <StorefrontPreview
              demo
              name={name}
              category="Restaurant"
              description={name.trim() ? "This is how your store could look to customers on DOORS." : "Start typing your business name to see your storefront come alive."}
              logo={null}
              cover={null}
              products={[{ key: 1, name: "Your best seller", price: "", photo: null }, { key: 2, name: "Another favourite", price: "", photo: null }]}
              hours="Your opening hours"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- riders --- */

function RiderSection({ onApply }: { onApply: () => void }) {
  const [p, setP] = useState(0)
  const path = useRef<SVGPathElement>(null)
  const [pt, setPt] = useState({ x: 40, y: 190 })
  useEffect(() => {
    const el = path.current
    if (!el) return
    const len = el.getTotalLength()
    const q = el.getPointAtLength((p / 100) * len)
    setPt({ x: q.x, y: q.y })
  }, [p])
  function demoRun() {
    const o = { v: 0 }
    gsap.to(o, { v: 100, duration: 2.4, ease: "power2.inOut", onUpdate: () => setP(Math.round(o.v)) })
  }
  const stage = p >= 100 ? "Delivered! 🎉" : p > 55 ? "Almost there…" : p > 5 ? "On the way" : "Order picked up"
  const perks = [
    ["Flexible hours", "Choose full-time, part-time, evenings or weekends."],
    ["Local routes", "Deliver around ESUT, Agbani and nearby areas you know."],
    ["Clear workflow", "Accept → pick up → deliver, all from the rider app."],
    ["Join the network", "Be part of DOORS from launch day."],
  ]
  return (
    <section id="riders" aria-labelledby="rider-title" className="bg-white py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <div data-reveal className="order-2 lg:order-1">
          <div className="rounded-[32px] border border-[#EDEDED] bg-[#F7F7F7] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <Chrome tone="red" label="Delivery run" />
              <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold" aria-live="polite">{stage}</span>
            </div>
            <svg viewBox="0 0 420 240" className="mt-4 w-full" role="img" aria-label="A delivery route from a vendor to a customer">
              <rect x="0" y="0" width="420" height="240" rx="24" fill="#FFFFFF" />
              <path d="M40 190 C120 190 110 70 210 90 C300 110 290 40 380 50" stroke="#F3F3F3" strokeWidth="26" strokeLinecap="round" fill="none" />
              <path ref={path} d="M40 190 C120 190 110 70 210 90 C300 110 290 40 380 50" stroke="#D71920" strokeWidth="4" strokeDasharray="2 12" strokeLinecap="round" fill="none" />
              <g><circle cx="40" cy="190" r="18" fill="#171717" /><text x="40" y="226" textAnchor="middle" fontSize="12" fontWeight="800" fill="#525252">Vendor</text></g>
              <g><path d="M366 40 C366 28 374 20 384 20 C394 20 402 28 402 40 C402 54 384 70 384 70 C384 70 366 54 366 40 Z" fill={p >= 100 ? "#1F9D55" : "#D71920"} transform="translate(-4 -6)" /><text x="380" y="88" textAnchor="middle" fontSize="12" fontWeight="800" fill="#525252">Customer</text></g>
              <g transform={`translate(${pt.x - 18} ${pt.y - 18})`}>
                <circle cx="18" cy="18" r="18" fill="#D71920" />
                <path d="M10 22 a4 4 0 1 0 0.1 0 M26 22 a4 4 0 1 0 0.1 0 M10 22 L16 13 L22 13 L26 22 M16 13 L14 9" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </svg>
            <label className="mt-4 block text-sm font-bold">
              <span className="sr-only">Move the rider along the route</span>
              <input type="range" min={0} max={100} value={p} onChange={(e) => setP(Number(e.target.value))} className="w-full accent-[#D71920]" />
            </label>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-[#737373]">Drag the slider, or</p>
              <button type="button" onClick={demoRun} className="rounded-xl bg-[#171717] px-4 py-2 text-xs font-extrabold text-white active:scale-95">Try a delivery run</button>
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <div data-reveal>
            <Eyebrow><Bike aria-hidden="true" className="size-3.5" />For riders</Eyebrow>
            <h2 id="rider-title" className="mt-4 font-display text-[clamp(2.1rem,5.4vw,3.8rem)] font-extrabold leading-[1] tracking-[-0.04em]">Earn with DOORS. <span className="text-[#D71920]">Move your community.</span></h2>
            <p className="mt-5 max-w-xl text-lg text-[#525252]">We&apos;re building a team of reliable delivery riders to serve ESUT, Agbani and the surrounding areas.</p>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {perks.map(([t, b]) => (
              <li key={t} data-reveal className="rounded-3xl bg-[#F7F7F7] p-5">
                <p className="font-display text-lg font-extrabold">{t}</p>
                <p className="mt-1 text-sm text-[#6B6B6B]">{b}</p>
              </li>
            ))}
          </ul>
          <div data-reveal className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Cta onClick={onApply}>Apply as a rider</Cta>
            <p className="text-sm text-[#737373]">18+ · Bicycle, motorcycle or keke</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------ community (blue) --- */

const NODES = [
  { id: "customers", label: "Customers", sub: "Students, staff & residents", x: 120, y: 90, icon: Users, text: "Students, staff and residents get food and everyday essentials from vendors they already know, without leaving home or the hostel." },
  { id: "kitchens", label: "Local kitchens", sub: "Restaurants & food vendors", x: 480, y: 90, icon: UtensilsCrossed, text: "Local restaurants and food vendors reach more people in their own neighbourhood, and keep money in the community." },
  { id: "stores", label: "Supermarkets", sub: "Stores & provisions", x: 480, y: 310, icon: ShoppingBasket, text: "Supermarkets and grocery stores get a new way to serve customers who can't always make the trip." },
  { id: "riders", label: "Riders", sub: "Local delivery partners", x: 120, y: 310, icon: Bike, text: "Riders from the area connect it all, delivering on routes they know well." },
] as const

function Community() {
  const [active, setActive] = useState<(typeof NODES)[number]["id"]>("customers")
  const node = NODES.find((n) => n.id === active)!
  return (
    <section id="community" aria-labelledby="community-title" className="relative overflow-hidden bg-[#1F4FD8] py-20 text-white sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.12)_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <div data-reveal>
            <Eyebrow tone="blue">Local impact</Eyebrow>
            <h2 id="community-title" className="mt-4 font-display text-[clamp(2.1rem,5.4vw,3.8rem)] font-extrabold leading-[1] tracking-[-0.04em]">Built around your community.</h2>
            <p className="mt-5 max-w-lg text-lg text-white/80">DOORS isn&apos;t a faraway app. It&apos;s a local network that supports the businesses around you and makes everyday needs easier for everyone in ESUT and Agbani.</p>
          </div>
          <div data-reveal className="mt-8 rounded-3xl bg-white p-5 text-[#171717]" aria-live="polite">
            <Chrome tone="blue" label={node.label} />
            <p className="mt-3 text-[15px] leading-relaxed text-[#404040]">{node.text}</p>
          </div>
          <p data-reveal className="mt-3 text-sm text-white/60">Tap a part of the network to explore it.</p>
        </div>
        <div data-reveal>
          <svg viewBox="0 0 600 400" className="w-full" role="group" aria-label="The DOORS community network">
            <rect x="20" y="20" width="250" height="160" rx="40" fill="#fff" opacity="0.07" />
            <text x="44" y="166" fontSize="14" fontWeight="800" fill="#fff" opacity="0.6" letterSpacing="2">ESUT CAMPUS</text>
            <rect x="330" y="220" width="250" height="160" rx="40" fill="#fff" opacity="0.07" />
            <text x="556" y="246" textAnchor="end" fontSize="14" fontWeight="800" fill="#fff" opacity="0.6" letterSpacing="2">AGBANI TOWN</text>
            {NODES.map((n) => (
              <path key={n.id} className="route-dash" d={`M300 200 Q ${(300 + n.x) / 2 + (n.y < 200 ? 30 : -30)} ${(200 + n.y) / 2} ${n.x} ${n.y}`} stroke={active === n.id ? "#fff" : "#9DB6FF"} strokeWidth={active === n.id ? 4 : 2.5} strokeDasharray="6 10" strokeLinecap="round" fill="none" />
            ))}
            <g className="community-node">
              <circle cx="300" cy="200" r="54" fill="#D71920" />
              <circle cx="300" cy="200" r="54" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="10" />
              <image href="/brand/doors-mark-white.png" x="270" y="180" width="60" height="44" />
            </g>
            {NODES.map((n) => {
              const on = active === n.id
              return (
                <g
                  key={n.id}
                  className="community-node cursor-pointer outline-none"
                  role="button"
                  tabIndex={0}
                  aria-pressed={on}
                  aria-label={`${n.label}: ${n.sub}`}
                  onClick={() => setActive(n.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(n.id) } }}
                  onMouseEnter={() => setActive(n.id)}
                >
                  <circle cx={n.x} cy={n.y} r={on ? 44 : 38} fill={on ? "#fff" : "#163CA8"} stroke="#fff" strokeOpacity={on ? 1 : 0.4} strokeWidth="2" style={{ transition: "all .3s" }} />
                  <foreignObject x={n.x - 14} y={n.y - 14} width="28" height="28" pointerEvents="none">
                    <n.icon className={cn("size-7", on ? "text-[#1F4FD8]" : "text-white")} aria-hidden="true" />
                  </foreignObject>
                  <text x={n.x} y={n.y + (n.y < 200 ? -58 : 66)} textAnchor="middle" fontSize="19" fontWeight="800" fill="#fff">{n.label}</text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- waitlist --- */

function Waitlist() {
  return (
    <section id="waitlist" aria-labelledby="waitlist-title" className="scroll-mt-20 bg-[#F7F7F7] py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-start gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <div data-reveal className="lg:sticky lg:top-28">
          <Eyebrow><Sparkles aria-hidden="true" className="size-3.5" />Customer waitlist</Eyebrow>
          <h2 id="waitlist-title" className="mt-4 font-display text-[clamp(2.1rem,5.4vw,3.8rem)] font-extrabold leading-[1] tracking-[-0.04em]">Be among the first to experience DOORS.</h2>
          <p className="mt-5 max-w-lg text-lg text-[#525252]">Your favourite food and everyday groceries from local vendors around ESUT and Agbani, delivered to you.</p>
          <ul className="mt-6 flex flex-col gap-2 text-[15px] font-semibold">
            {["Takes under a minute", "Hear first when ordering opens", "No spam, ever"].map((t) => <li key={t} className="flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-full bg-[#171717] text-white"><Check aria-hidden="true" className="size-3.5" /></span>{t}</li>)}
          </ul>
        </div>
        <div data-reveal className="rounded-[32px] bg-white p-5 shadow-[0_30px_60px_-40px_rgb(23_23_23/0.35)] sm:p-8">
          <Chrome tone="red" label="Join the waitlist" className="mb-6 text-[#D71920]" />
          <WaitlistForm />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------- faq --- */

function Faq() {
  const qs = [
    ["When does DOORS launch?", "We launch on 6 December 2026. Join the waitlist and we'll let you know the moment ordering opens."],
    ["Where does DOORS deliver?", "We're starting with ESUT and the surrounding Agbani community, and will grow from there."],
    ["What can I order?", "Food from local restaurants and food vendors, and groceries from local supermarkets and stores. We also offer a waybill service for parcels."],
    ["Does my business need to be CAC registered?", "No. Small and informal food vendors are welcome to apply. Tell us your registration status in the form and we'll guide you."],
    ["What do I need to become a rider?", "You must be 18 or older, with access to a bicycle, motorcycle or keke. Shortlisted applicants are invited to a short screening."],
    ["How is my information used?", "Only to process your sign-up or application and to contact you about DOORS. Rider documents are stored privately and seen only by the DOORS admin team."],
  ]
  return (
    <section aria-labelledby="faq-title" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 id="faq-title" data-reveal className="text-center font-display text-[clamp(2rem,5vw,3rem)] font-extrabold tracking-[-0.035em]">Questions, answered.</h2>
        <div className="mt-10 flex flex-col gap-3">
          {qs.map(([q, a]) => (
            <details key={q} data-reveal className="group rounded-3xl bg-[#F7F7F7] px-5 py-4 open:bg-white open:shadow-[0_0_0_1.5px_#171717]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-1 font-display text-lg font-extrabold tracking-tight [&::-webkit-details-marker]:hidden">
                {q}<ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-1 pt-2 text-[15px] leading-relaxed text-[#525252]">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------- final cta --- */

function FinalCta({ onWaitlist, onVendor, onRider }: { onWaitlist: () => void; onVendor: () => void; onRider: () => void }) {
  const tiles = [
    { title: "Join the customer waitlist", body: "Be first to order.", icon: Sparkles, onClick: onWaitlist, cls: "bg-white text-[#171717]", tone: "light" as const },
    { title: "Register your business", body: "Get more customers.", icon: Store, onClick: onVendor, cls: "bg-[#171717] text-white", tone: "dark" as const },
    { title: "Become a DOORS rider", body: "Earn on local routes.", icon: Bike, onClick: onRider, cls: "bg-[#A50F15] text-white", tone: "red" as const },
  ]
  return (
    <section aria-labelledby="final-title" className="bg-white px-4 pb-20 sm:px-6 sm:pb-28">
      <div data-reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-[#D71920] px-5 py-14 text-white sm:px-12 sm:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-10 select-none font-display text-[16rem] font-extrabold leading-none tracking-[-0.06em] text-white/[0.07]">DOORS</div>
        <div className="relative max-w-3xl">
          <h2 id="final-title" className="font-display text-[clamp(2.2rem,6vw,4.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">Your everyday needs are about to get easier.</h2>
          <p className="mt-4 flex items-center gap-2 text-white/80"><Clock aria-hidden="true" className="size-4" />Launching 6 December 2026 around ESUT &amp; Agbani.</p>
        </div>
        <div className="relative mt-10 grid gap-3 md:grid-cols-3">
          {tiles.map((t) => (
            <button key={t.title} type="button" onClick={t.onClick} className={cn("group flex min-h-40 flex-col justify-between rounded-3xl p-5 text-left transition-transform duration-300 hover:-translate-y-1.5 active:scale-[0.98]", t.cls)}>
              <Chrome tone={t.tone} />
              <span>
                <span className="flex items-center justify-between gap-3 font-display text-xl font-extrabold leading-tight tracking-tight">{t.title}<ArrowRight aria-hidden="true" className="size-5 shrink-0 transition-transform group-hover:translate-x-1" /></span>
                <span className="mt-1 block text-sm opacity-70">{t.body}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- footer --- */

function Footer() {
  return (
    <footer className="bg-[#171717] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <BrandLogo tone="white" className="h-8" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">Doorsteps Logistics (DOORS) connects customers around ESUT and Agbani, Enugu State, to local food and grocery vendors, and delivers to their door.</p>
        </div>
        <nav aria-label="Footer">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">Explore</p>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm font-semibold">
            {LINKS.map((l) => <li key={l.href}><a href={l.href} className="text-white/80 hover:text-white">{l.label}</a></li>)}
          </ul>
        </nav>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">Join DOORS</p>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm font-semibold">
            <li><a href="#waitlist" className="text-white/80 hover:text-white">Customer waitlist</a></li>
            <li><a href="#apply-vendor" className="text-white/80 hover:text-white">Vendor registration</a></li>
            <li><a href="#apply-rider" className="text-white/80 hover:text-white">Rider application</a></li>
            <li><Link href="/privacy" className="text-white/80 hover:text-white">Privacy notice</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-white/40 sm:px-6">© {new Date().getFullYear()} Doorsteps Logistics. All rights reserved.</p>
      </div>
    </footer>
  )
}
