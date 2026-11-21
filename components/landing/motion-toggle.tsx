"use client"

import { Pause, Play } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Always-visible "Pause animations" control. It grows and gets a red ring
 * while the visitor's pointer is over an animated area (`highlight`), so it's
 * easy to find exactly when the motion might be bothering them.
 */
export function MotionToggle({ paused, onToggle, highlight }: { paused: boolean; onToggle: () => void; highlight: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={paused}
      aria-label={paused ? "Play animations" : "Pause animations"}
      className={cn(
        "fixed bottom-4 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#171717]/90 px-4 text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgb(0_0_0/0.6)] backdrop-blur transition-all duration-300 hover:bg-[#171717] sm:bottom-6 sm:right-6",
        "pb-[env(safe-area-inset-bottom)]",
        highlight && !paused && "scale-110 ring-4 ring-[#D71920]/60",
      )}
    >
      {paused ? <Play aria-hidden="true" className="size-4 fill-current" /> : <Pause aria-hidden="true" className="size-4 fill-current" />}
      <span>{paused ? "Play animations" : "Pause animations"}</span>
    </button>
  )
}
