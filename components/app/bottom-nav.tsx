"use client"

import { Bell, Home, Receipt, ShoppingCart, User } from "lucide-react"
import { useApp, type Screen } from "@/lib/store"
import { cn } from "@/lib/utils"

const items: { screen: Screen; label: string; icon: typeof Home }[] = [
  { screen: "home", label: "Home", icon: Home },
  { screen: "orders", label: "Orders", icon: Receipt },
  { screen: "cart", label: "Cart", icon: ShoppingCart },
  { screen: "notifications", label: "Alerts", icon: Bell },
  { screen: "profile", label: "Profile", icon: User },
]

export function BottomNav() {
  const { screen, navigate, cartCount } = useApp()
  return (
    <nav className="sticky bottom-0 z-30 border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="flex items-stretch justify-between">
        {items.map((item) => {
          const active = screen === item.screen
          const Icon = item.icon
          return (
            <button
              key={item.screen}
              type="button"
              onClick={() => navigate(item.screen)}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              <span className="relative">
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-colors",
                    active ? "text-brand" : "text-muted-foreground",
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
                {item.screen === "cart" && cartCount > 0 ? (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                    {cartCount}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold transition-colors",
                  active ? "text-brand" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
