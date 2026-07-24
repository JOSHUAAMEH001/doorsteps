"use client"

import type { ReactNode } from "react"

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-secondary md:p-6">
      <div className="relative flex h-dvh w-full max-w-[420px] flex-col overflow-hidden bg-background md:h-[860px] md:rounded-[2.75rem] md:border-8 md:border-foreground/90 md:shadow-2xl">
        {/* Notch (desktop only) */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-50 hidden h-6 w-36 -translate-x-1/2 rounded-b-2xl bg-foreground/90 md:block" />
        {children}
      </div>
    </div>
  )
}
