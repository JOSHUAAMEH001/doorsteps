"use client"

import { useEffect, useState, type FormEvent } from "react"
import {
  Bell,
  Home,
  LogOut,
  Menu,
  PackageCheck,
  Receipt,
  Search,
  ShoppingCart,
  User,
  X,
} from "lucide-react"
import { tabForScreen, useApp, type Screen } from "@/lib/store"
import { BottomNav } from "@/components/app/bottom-nav"
import { SplashScreen } from "@/components/screens/splash-screen"
import { OnboardingScreen } from "@/components/screens/onboarding-screen"
import { AuthScreen } from "@/components/screens/auth-screen"
import { HomeScreen } from "@/components/screens/home-screen"
import { VendorsScreen } from "@/components/screens/vendors-screen"
import { VendorScreen } from "@/components/screens/vendor-screen"
import { ProductScreen } from "@/components/screens/product-screen"
import { CartScreen } from "@/components/screens/cart-screen"
import { DeliveryScreen } from "@/components/screens/delivery-screen"
import { PaymentScreen } from "@/components/screens/payment-screen"
import { TrackingScreen } from "@/components/screens/tracking-screen"
import { SuccessScreen } from "@/components/screens/success-screen"
import { RoleDashboardScreen } from "@/components/screens/role-dashboard-screen"
import { AdminOrdersScreen } from "@/components/screens/admin-orders-screen"
import { NotificationsScreen } from "@/components/screens/notifications-screen"
import { ProfileScreen } from "@/components/screens/profile-screen"
import { SupportScreen } from "@/components/screens/support-screen"
import { SettingsScreen } from "@/components/screens/settings-screen"
import { BrandLogo } from "@/components/brand/logo"
import { cn } from "@/lib/utils"
import { useSignOut } from "@/components/dashboard/shell"
import { CartConflictDialog } from "@/components/app/cart-conflict-dialog"
import { OrderingClosedDialog } from "@/components/app/ordering-closed-dialog"
import { hasPendingRecovery } from "@/lib/auth-recovery"

/** Role dashboards render their own full-screen layout (sidebar, header, mobile nav). */
const WORKSPACE_SCREENS = new Set<Screen>(["vendorDashboard", "riderDashboard", "adminDashboard"])
const TAB_SCREENS = new Set<Screen>(["home", "orders", "cart", "notifications", "profile"])
const DESKTOP_NAV_SCREENS = new Set<Screen>([
  ...TAB_SCREENS,
  "vendorDashboard",
  "riderDashboard",
  "adminDashboard",
  "adminOrders",
])

type NavigationItem = { screen: Screen; label: string; icon: typeof Home }

const primaryItems: NavigationItem[] = [
  { screen: "home", label: "Home", icon: Home },
  { screen: "orders", label: "Orders", icon: Receipt },
  { screen: "cart", label: "Cart", icon: ShoppingCart },
  { screen: "notifications", label: "Alerts", icon: Bell },
  { screen: "profile", label: "Profile", icon: User },
]

function getNavigationItems(role: ReturnType<typeof useApp>["role"]): NavigationItem[] {
  const roleItem = role === "admin"
    ? { screen: "adminDashboard" as const, label: "Admin panel", icon: PackageCheck }
    : role === "vendor"
      ? { screen: "vendorDashboard" as const, label: "Vendor dashboard", icon: PackageCheck }
      : role === "rider"
        ? { screen: "riderDashboard" as const, label: "Rider dashboard", icon: PackageCheck }
        : null
  const items = roleItem ? [...primaryItems, roleItem] : [...primaryItems]
  if (role === "admin") {
    items.push(
      { screen: "vendorDashboard", label: "Vendor view", icon: PackageCheck },
      { screen: "riderDashboard", label: "Rider view", icon: PackageCheck },
      { screen: "orders", label: "Customer view", icon: User },
    )
  }
  return items
}

/**
 * Auth emails can land on "/" (Supabase falls back to the Site URL when a redirect URL
 * isn't allow-listed). Forward password-recovery links to the reset page and sign-up
 * confirmations to the callback, instead of showing the splash/sign-up screen.
 */
function useForwardAuthLinks() {
  useEffect(() => {
    const url = new URL(window.location.href)
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""))
    const code = url.searchParams.get("code")
    const isRecovery = hash.get("type") === "recovery" || url.searchParams.get("type") === "recovery"
    // Error params on "/" only ever come from Supabase email links (expired / already used).
    // Send them to a page that explains it, instead of silently showing the splash screen.
    const linkError = Boolean(url.searchParams.get("error_code") || hash.get("error_code"))
    if (isRecovery || linkError || (code && hasPendingRecovery())) {
      window.location.replace(`/reset-password${url.search}${url.hash}`)
    } else if (code) {
      window.location.replace(`/auth/callback?code=${encodeURIComponent(code)}`)
    }
  }, [])
}

export function AppShell() {
  useForwardAuthLinks()
  const { screen, role } = useApp()
  const showNav = TAB_SCREENS.has(screen)
  const isWorkspace = WORKSPACE_SCREENS.has(screen)
  const showDesktopNav = !isWorkspace && (DESKTOP_NAV_SCREENS.has(screen) || !["splash", "onboarding", "auth"].includes(screen))

  const content = (() => {
    switch (screen) {
      case "splash":
        return <SplashScreen />
      case "onboarding":
        return <OnboardingScreen />
      case "auth":
        return <AuthScreen />
      case "home":
        return <HomeScreen />
      case "vendors":
        return <VendorsScreen />
      case "vendor":
        return <VendorScreen />
      case "product":
        return <ProductScreen />
      case "cart":
        return <CartScreen />
      case "delivery":
        return <DeliveryScreen />
      case "payment":
        return <PaymentScreen />
      case "tracking":
        return <TrackingScreen />
      case "success":
        return <SuccessScreen />
      case "orders":
        return <RoleDashboardScreen role="customer" />
      case "vendorDashboard":
        return <RoleDashboardScreen role="vendor" />
      case "riderDashboard":
        return <RoleDashboardScreen role="rider" />
      case "adminDashboard":
        return <RoleDashboardScreen role="admin" />
      case "adminOrders":
        return <AdminOrdersScreen />
      case "notifications":
        return <NotificationsScreen />
      case "profile":
        return <ProfileScreen />
      case "support":
        return <SupportScreen />
      case "settings":
        return <SettingsScreen />
      default:
        return <HomeScreen />
    }
  })()

  if (isWorkspace) {
    return <div key={screen} className="flex min-h-0 flex-1">{content}</div>
  }

  return (
    <div className="flex min-h-0 flex-1">
      <OrderingClosedDialog />
      <CartConflictDialog />
      {showDesktopNav ? <DesktopSidebar /> : null}
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", showDesktopNav && "lg:ml-[240px]")}>
        {showDesktopNav ? <MobileHeader /> : null}
        {showDesktopNav ? <DesktopSearchBar /> : null}
        <main
          id="app-scroll"
          key={screen}
          className={cn(
            "no-scrollbar min-h-0 flex-1 overflow-y-auto",
            showNav && "pb-2 lg:pb-0",
          )}
        >
          <div className={cn("mx-auto min-h-full w-full", showDesktopNav && "max-w-[1280px]")}>
            {content}
          </div>
        </main>
        {showNav ? <BottomNav /> : null}
      </div>
    </div>
  )
}

function NavigationItems({ onNavigate }: { onNavigate: () => void }) {
  const { screen, role, navigate, cartCount } = useApp()
  const { signOut, busy: signingOut } = useSignOut()
  return (
    <>
      <nav aria-label="Main navigation" className="flex flex-col gap-1.5">
        {getNavigationItems(role).map((item) => {
          const Icon = item.icon
          // Role views match exactly; the customer tabs also cover their sub-screens.
          const active = screen === item.screen || (!WORKSPACE_SCREENS.has(item.screen) && tabForScreen(screen) === item.screen)
          return (
            <button
              key={`${item.screen}-${item.label}`}
              type="button"
              onClick={() => { navigate(item.screen); onNavigate() }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors",
                active ? "bg-[#D71920]/10 text-[#D71920]" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-5" />
              <span className="flex-1">{item.label}</span>
              {item.screen === "cart" && cartCount > 0 ? (
                <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-brand-foreground">{cartCount}</span>
              ) : null}
            </button>
          )
        })}
      </nav>
      <button
        type="button"
        onClick={() => { onNavigate(); void signOut() }}
        disabled={signingOut}
        className="mt-auto flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
      >
        <LogOut aria-hidden="true" className="size-5" />
        {signingOut ? "Signing out…" : "Logout"}
      </button>
    </>
  )
}

function DesktopSidebar() {
  const { navigate } = useApp()
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-border bg-background px-4 py-6 lg:flex">
      <button type="button" onClick={() => navigate("home")} aria-label="DOORS home" className="mb-8 flex items-center px-2 py-1 text-left">
        <BrandLogo tone="red" className="h-8" />
      </button>
      <NavigationItems onNavigate={() => {}} />
    </aside>
  )
}

function MobileHeader() {
  const [open, setOpen] = useState(false)
  const { screen, navigate } = useApp()

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  useEffect(() => { setOpen(false) }, [screen])

  return (
    <>
      <header className="flex h-14 shrink-0 items-center border-b border-border bg-background px-3 lg:hidden">
        <button type="button" aria-label="Open navigation menu" aria-expanded={open} onClick={() => setOpen(true)} className="inline-flex size-11 items-center justify-center rounded-xl text-[#D71920] hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          <Menu aria-hidden="true" className="size-6" />
        </button>
        <button type="button" onClick={() => navigate("home")} aria-label="DOORS home" className="ml-2 flex items-center py-2">
          <BrandLogo tone="red" className="h-6" />
        </button>
      </header>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/45" />
          <aside role="dialog" aria-modal="true" aria-label="Navigation menu" className="absolute inset-y-0 left-0 flex w-[min(84vw,320px)] flex-col border-r border-border bg-background px-4 py-5 shadow-2xl">
            <div className="mb-7 flex items-center justify-between px-2">
              <BrandLogo tone="red" className="h-7" />
              <button type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)} className="inline-flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><X aria-hidden="true" className="size-5" /></button>
            </div>
            <NavigationItems onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  )
}

function DesktopSearchBar() {
  const { navigate } = useApp()
  const [query, setQuery] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    navigate("vendors", { category: "food", searchQuery: query.trim() })
  }

  return (
    <header className="sticky top-0 z-30 hidden h-[76px] shrink-0 items-center border-b border-border bg-background/95 px-8 backdrop-blur lg:flex">
      <form onSubmit={handleSubmit} role="search" className="mx-auto flex w-full max-w-[1280px] items-center">
        <label className="flex h-11 w-full max-w-xl items-center gap-3 rounded-xl border border-border bg-secondary/70 px-4 text-muted-foreground focus-within:border-brand">
          <Search aria-hidden="true" className="size-4 shrink-0" />
          <span className="sr-only">Search vendors</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search food, groceries, vendors..."
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <button type="submit" className="ml-3 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-foreground hover:brightness-105">
          Search
        </button>
      </form>
    </header>
  )
}
