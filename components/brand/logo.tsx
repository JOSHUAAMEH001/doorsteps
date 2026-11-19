import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * Official DOORS brand assets, generated from the master logo
 * (white wordmark with speed-line "D"). Files live in /public/brand.
 *
 * - BrandLogo: full "DOORS" wordmark. Use `red` on white/light surfaces,
 *   `white` on brand red or dark surfaces, `dark` for small/neutral contexts.
 * - LogoMark: the speed-line "D" on a red tile, for compact/icon spots.
 */

const WORDMARK = { width: 1104, height: 243 }
const MARK = { width: 385, height: 279 }

export type LogoTone = "red" | "white" | "dark"

export function BrandLogo({ tone = "red", className, priority = false }: { tone?: LogoTone; className?: string; priority?: boolean }) {
  return (
    <Image
      src={`/brand/doors-logo-${tone}.png`}
      alt="DOORS"
      width={WORDMARK.width}
      height={WORDMARK.height}
      priority={priority}
      className={cn("h-8 w-auto select-none", className)}
      draggable={false}
    />
  )
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center rounded-2xl bg-brand shadow-sm", className)}>
      <Image src="/brand/doors-mark-white.png" alt="" aria-hidden="true" width={MARK.width} height={MARK.height} className="h-auto w-[72%] select-none" draggable={false} />
    </div>
  )
}

export function Logo({
  size = "md",
  showTagline = false,
}: {
  size?: "sm" | "md" | "lg"
  showTagline?: boolean
}) {
  const height = size === "lg" ? "h-11" : size === "sm" ? "h-6" : "h-8"
  return (
    <div className="flex flex-col items-start gap-1.5">
      <BrandLogo tone="red" className={height} priority />
      {showTagline ? (
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">
          Campus delivery · ESUT Agbani
        </p>
      ) : null}
    </div>
  )
}
