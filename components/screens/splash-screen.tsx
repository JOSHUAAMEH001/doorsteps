"use client"

import { useEffect } from "react"
import { BrandLogo } from "@/components/brand/logo"
import { useApp } from "@/lib/store"

export function SplashScreen() {
  const { navigate } = useApp()

  useEffect(() => {
    const t = setTimeout(() => navigate("onboarding"), 2400)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-brand px-8 text-center">
      <h1 className="m-0">
        <BrandLogo tone="white" priority className="h-auto w-[min(72vw,300px)]" />
      </h1>
      <p className="mt-4 text-sm font-medium text-brand-foreground/80">
        Campus delivery · ESUT Agbani
      </p>

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
