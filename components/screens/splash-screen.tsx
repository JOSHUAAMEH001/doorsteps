"use client"

import { useEffect } from "react"
import { LogoMark } from "@/components/brand/logo"
import { useApp } from "@/lib/store"

export function SplashScreen() {
  const { navigate } = useApp()

  useEffect(() => {
    const t = setTimeout(() => navigate("onboarding"), 2400)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-brand px-8 text-center">
      <div className="animate-scale-in">
        <LogoMark className="h-20 w-20 bg-brand-foreground text-brand" />
      </div>
      <div className="mt-6 animate-fade-in-up">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-foreground">
          Doorsteps
        </h1>
        <p className="mt-1 text-sm font-medium text-brand-foreground/80">
          Logistics — ESUT Agbani
        </p>
      </div>

      <p className="absolute bottom-24 max-w-[240px] text-balance text-sm font-medium text-brand-foreground/80">
        Your campus. Delivered to your doorstep.
      </p>

      <div className="absolute bottom-12 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-brand-foreground/90"
            style={{
              animation: "fade-in-up 0.6s ease-in-out infinite alternate",
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
