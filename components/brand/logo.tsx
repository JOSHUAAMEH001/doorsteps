import { DoorOpen } from "lucide-react"
import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm",
        className,
      )}
    >
      <DoorOpen className="h-1/2 w-1/2" strokeWidth={2.2} />
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
  const mark =
    size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10"
  const title =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg"
  return (
    <div className="flex items-center gap-3">
      <LogoMark className={mark} />
      <div className="leading-tight">
        <p className={cn("font-extrabold tracking-tight text-foreground", title)}>
          Doorsteps
          <span className="text-brand">.</span>
        </p>
        {showTagline ? (
          <p className="text-xs font-medium text-muted-foreground">
            Logistics
          </p>
        ) : null}
      </div>
    </div>
  )
}
