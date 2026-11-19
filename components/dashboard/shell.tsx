"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useSWRConfig } from "swr"
import { Bell, LogOut, Menu, Store, X, type LucideIcon } from "lucide-react"
import { LogoMark } from "@/components/brand/logo"
import { useApp } from "@/lib/store"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export type NavItem<T extends string> = { id: T; label: string; icon: LucideIcon; badge?: number; group?: string }

export type ShellNotice = { id: string; title: string; body: string; time: string; onOpen?: () => void }

/** Ends the Supabase session for real, clears cached data, and returns to sign-in. */
export function useSignOut() {
  const { navigate } = useApp()
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState(false)
  async function signOut() {
    setBusy(true)
    try {
      await createClient().auth.signOut()
    } catch (error) {
      console.error("[auth] sign out failed", error)
    }
    await mutate(() => true, undefined, { revalidate: false })
    setBusy(false)
    navigate("auth")
  }
  return { signOut, busy }
}

export function DashboardShell<T extends string>({
  roleLabel,
  title,
  subtitle,
  nav,
  active,
  onSelect,
  notices,
  userName,
  headerExtra,
  children,
}: {
  roleLabel: string
  title: string
  subtitle?: string
  nav: NavItem<T>[]
  active: T
  onSelect: (id: T) => void
  notices: ShellNotice[]
  userName: string
  headerExtra?: ReactNode
  children: ReactNode
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setDrawerOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [drawerOpen])

  function select(id: T) {
    onSelect(id)
    setDrawerOpen(false)
    document.getElementById("dashboard-scroll")?.scrollTo({ top: 0 })
  }

  return (
    <div className="flex h-full min-h-0 w-full bg-[#f6f6f8]">
      <aside className="hidden w-[256px] shrink-0 flex-col bg-brand text-white lg:flex">
        <SidebarContent roleLabel={roleLabel} nav={nav} active={active} onSelect={select} />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Dashboard menu">
          <button type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/40" />
          <aside className="doors-slide-in absolute inset-y-0 left-0 flex w-[82%] max-w-[300px] flex-col bg-brand text-white shadow-2xl">
            <button type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="absolute right-3 top-4 flex size-10 items-center justify-center rounded-xl text-white/80 hover:bg-white/10">
              <X aria-hidden="true" className="size-5" />
            </button>
            <SidebarContent roleLabel={roleLabel} nav={nav} active={active} onSelect={select} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8 lg:py-4">
          <button type="button" aria-label="Open menu" onClick={() => setDrawerOpen(true)} className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border text-foreground lg:hidden">
            <Menu aria-hidden="true" className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold tracking-tight text-foreground sm:text-xl">{title}</h1>
            {subtitle ? <p className="hidden truncate text-xs text-muted-foreground sm:block sm:text-sm">{subtitle}</p> : null}
          </div>
          {headerExtra}
          <NotificationBell notices={notices} />
          <div className="hidden items-center gap-2.5 sm:flex">
            <span className="flex size-10 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white">{(userName[0] ?? "D").toUpperCase()}</span>
            <span className="max-w-[140px] truncate text-sm font-bold text-foreground">{userName}</span>
          </div>
        </header>
        <main id="dashboard-scroll" className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div key={active} className="doors-fade-in mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</div>
        </main>
      </div>
    </div>
  )
}

function SidebarContent<T extends string>({ roleLabel, nav, active, onSelect }: { roleLabel: string; nav: NavItem<T>[]; active: T; onSelect: (id: T) => void }) {
  const { navigate } = useApp()
  const { signOut, busy } = useSignOut()
  let lastGroup: string | undefined

  return (
    <>
      <div className="flex items-center gap-3 px-6 pb-6 pt-6">
        <LogoMark className="size-10 shrink-0 bg-white text-brand" />
        <div>
          <p className="text-lg font-extrabold tracking-[0.12em]">DOORS</p>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{roleLabel}</p>
        </div>
      </div>
      <nav aria-label={`${roleLabel} navigation`} className="no-scrollbar flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4">
        {nav.map((item) => {
          const Icon = item.icon
          const isActive = item.id === active
          const heading = item.group && item.group !== lastGroup ? item.group : null
          lastGroup = item.group
          return (
            <div key={item.id}>
              {heading ? <p className="px-3 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">{heading}</p> : null}
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-white",
                  isActive ? "bg-white text-brand shadow-sm" : "text-white/85 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge ? (
                  <span className={cn("min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-extrabold tabular-nums", isActive ? "bg-brand text-white" : "bg-white text-brand")}>{item.badge > 99 ? "99+" : item.badge}</span>
                ) : null}
              </button>
            </div>
          )
        })}
      </nav>
      <div className="flex flex-col gap-1 border-t border-white/15 px-3 py-4">
        <button type="button" onClick={() => navigate("home")} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white">
          <Store aria-hidden="true" className="size-[18px]" />
          Customer app
        </button>
        <button type="button" onClick={() => void signOut()} disabled={busy} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white disabled:opacity-60">
          <LogOut aria-hidden="true" className="size-[18px]" />
          {busy ? "Signing out…" : "Log out"}
        </button>
      </div>
    </>
  )
}

function NotificationBell({ notices }: { notices: ShellNotice[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${notices.length ? `, ${notices.length} need attention` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex size-10 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-secondary"
      >
        <Bell aria-hidden="true" className="size-5" />
        {notices.length ? (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 py-0.5 text-[10px] font-extrabold text-white ring-2 ring-background">{notices.length > 9 ? "9+" : notices.length}</span>
        ) : null}
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="doors-fade-in absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <p className="border-b border-border px-4 py-3 text-sm font-bold text-foreground">Needs attention</p>
            {notices.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">You&apos;re all caught up.</p>
            ) : (
              <ul className="max-h-[360px] overflow-y-auto">
                {notices.map((notice) => (
                  <li key={notice.id} className="border-b border-border last:border-0">
                    <button type="button" onClick={() => { notice.onOpen?.(); setOpen(false) }} className="flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-secondary">
                      <span className="flex items-center justify-between gap-3 text-sm font-bold text-foreground">{notice.title}<span className="shrink-0 text-[11px] font-medium text-muted-foreground">{notice.time}</span></span>
                      <span className="text-xs text-muted-foreground">{notice.body}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
