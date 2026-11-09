"use client"

import type { ReactNode } from "react"

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-secondary">
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-background md:max-w-none md:rounded-none md:border-0 md:shadow-none">
        {/* The phone treatment is intentionally removed on laptop-sized screens so the app reads as a landscape web experience. */}
        {children}
        <p className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[10px] text-muted-foreground/70">
          Images are for demonstration.
        </p>
      </div>
    </div>
  )
}
