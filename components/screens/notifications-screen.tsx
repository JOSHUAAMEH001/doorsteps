"use client"

import { Package, Tag, Info } from "lucide-react"
import { useApp } from "@/lib/store"
import { ScreenHeader } from "@/components/app/ui"
import { notifications, type AppNotification } from "@/lib/data"
import { cn } from "@/lib/utils"

const iconFor = {
  order: Package,
  promo: Tag,
  system: Info,
}

const toneFor = {
  order: "bg-brand-soft text-brand",
  promo: "bg-warning-soft text-warning-strong",
  system: "bg-secondary text-muted-foreground",
}

export function NotificationsScreen() {
  const { navigate } = useApp()

  return (
    <div className="flex min-h-full flex-col bg-background pb-24">
      <ScreenHeader
        title="Notifications"
        right={
          <button type="button" className="text-xs font-semibold text-brand">
            Mark all read
          </button>
        }
      />
      <div className="divide-y divide-border">
        {notifications.map((n: AppNotification) => {
          const Icon = iconFor[n.type]
          return (
            <button
              type="button"
              key={n.id}
              onClick={() => n.type === "order" && navigate("tracking")}
              className={cn(
                "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors active:bg-secondary",
                n.unread && "bg-brand-soft/40",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  toneFor[n.type],
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-foreground">{n.title}</p>
                  {n.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {n.body}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{n.time}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
