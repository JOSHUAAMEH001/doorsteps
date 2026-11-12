"use client"

import { ArrowLeft, LoaderCircle } from "lucide-react"
import type { ReactNode } from "react"
import { useApp } from "@/lib/store"
import { cn } from "@/lib/utils"

export function ScreenHeader({
  title,
  subtitle,
  right,
  onBack,
  transparent,
}: {
  title?: string
  subtitle?: string
  right?: ReactNode
  onBack?: () => void
  transparent?: boolean
}) {
  const { back, canGoBack } = useApp()
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center gap-3 px-4 py-3.5",
        transparent
          ? "bg-transparent"
          : "border-b border-border bg-background/95 backdrop-blur",
      )}
    >
      {(canGoBack || onBack) && (
        <button
          type="button"
          aria-label="Go back"
          onClick={() => (onBack ? onBack() : back())}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      {title ? (
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-foreground">{title}</h1>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      ) : (
        <div className="flex-1" />
      )}
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  )
}

export function LoadingState({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-2 py-8 text-sm font-medium text-muted-foreground", className)}>
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-brand" />
      <span>{label}</span>
    </div>
  )
}

export function PrimaryButton({
  children,
  onClick,
  className,
  disabled,
  type = "button",
  variant = "solid",
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  type?: "button" | "submit"
  variant?: "solid" | "outline" | "soft"
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55",
        variant === "solid" &&
          "bg-brand text-brand-foreground shadow-sm shadow-brand/20 hover:brightness-105",
        variant === "outline" &&
          "border border-border bg-background text-foreground hover:bg-secondary",
        variant === "soft" && "bg-brand-soft text-brand hover:brightness-95",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Pill({
  children,
  active,
  onClick,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        active
          ? "border-brand bg-brand text-brand-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  )
}

export function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-warning text-warning">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
      </svg>
      {value.toFixed(1)}
    </span>
  )
}
