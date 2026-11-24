"use client"

import useSWR, { mutate } from "swr"
import { LogIn, Package } from "lucide-react"
import { useApp } from "@/lib/store"
import { ScreenHeader } from "@/components/app/ui"
import { PushToggle } from "@/components/app/push-toggle"
import { getMyNotifications, markNotificationsRead, type AppNotificationRow } from "@/app/actions/notifications"
import { NOTIFICATIONS_KEY, UNREAD_KEY, screenForLink } from "@/lib/use-notifications"
import { cn } from "@/lib/utils"

function timeAgo(iso: string) {
  const then = new Date(iso).getTime()
  const minutes = Math.round((Date.now() - then) / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(iso).toLocaleString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
}

export function NotificationsScreen() {
  const { navigate, isSignedIn, authChecked, role } = useApp()
  const { data, isLoading } = useSWR(isSignedIn ? NOTIFICATIONS_KEY : null, () => getMyNotifications(), {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  })
  const items = data?.items ?? []
  const unread = items.filter((n) => !n.read_at).length

  async function markAllRead() {
    if (!unread) return
    const now = new Date().toISOString()
    await mutate(NOTIFICATIONS_KEY, { items: items.map((n) => ({ ...n, read_at: n.read_at ?? now })), error: null }, { revalidate: false })
    await mutate(UNREAD_KEY, 0, { revalidate: false })
    await markNotificationsRead()
    void mutate(NOTIFICATIONS_KEY)
    void mutate(UNREAD_KEY)
  }

  function open(n: AppNotificationRow) {
    if (!n.read_at) {
      void markNotificationsRead([n.id]).then(() => { void mutate(NOTIFICATIONS_KEY); void mutate(UNREAD_KEY) })
    }
    navigate(screenForLink(n.link, role))
  }

  return (
    <div className="flex min-h-full flex-col bg-background pb-24">
      <ScreenHeader
        title="Notifications"
        right={
          isSignedIn && unread ? (
            <button type="button" onClick={() => void markAllRead()} className="text-xs font-semibold text-brand">
              Mark all read
            </button>
          ) : undefined
        }
      />

      {!authChecked ? (
        <div role="status" aria-label="Loading notifications" className="flex flex-col gap-3 px-5 pt-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-secondary" />)}
        </div>
      ) : !isSignedIn ? (
        <div className="mx-5 mt-2 rounded-3xl border border-border bg-card p-5">
          <p className="text-lg font-extrabold text-foreground">Log in to see your notifications</p>
          <p className="mt-1 text-sm text-muted-foreground">We&apos;ll tell you when your order is accepted, picked up and delivered.</p>
          <button
            type="button"
            onClick={() => navigate("auth")}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-bold text-brand-foreground active:scale-[0.98]"
          >
            <LogIn aria-hidden="true" className="size-4" />
            Log in or sign up
          </button>
        </div>
      ) : (
        <>
          <div className="px-5 pt-1">
            <PushToggle why="when a restaurant accepts your order, when it's on the way and when it's delivered" />
          </div>

          {data?.error ? <p role="alert" className="px-5 pt-4 text-sm text-destructive">{data.error}</p> : null}

          {isLoading && !data ? (
            <div role="status" aria-label="Loading notifications" className="flex flex-col gap-3 px-5 pt-4">
              {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-secondary" />)}
            </div>
          ) : items.length === 0 ? (
            <p className="px-5 py-14 text-center text-sm text-muted-foreground">No notifications yet. Updates about your orders will appear here.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => open(n)}
                    className={cn("flex w-full items-start gap-3 px-5 py-4 text-left transition-colors active:bg-secondary", !n.read_at && "bg-brand-soft/40")}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <Package aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-foreground">{n.title}</span>
                        {!n.read_at ? <span aria-label="Unread" className="size-2 shrink-0 rounded-full bg-brand" /> : null}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
