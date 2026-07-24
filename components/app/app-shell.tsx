"use client"

import { useApp } from "@/lib/store"
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
import { OrdersScreen } from "@/components/screens/orders-screen"
import { NotificationsScreen } from "@/components/screens/notifications-screen"
import { ProfileScreen } from "@/components/screens/profile-screen"
import { SupportScreen } from "@/components/screens/support-screen"
import { SettingsScreen } from "@/components/screens/settings-screen"

const TAB_SCREENS = new Set(["home", "orders", "cart", "notifications", "profile"])

export function AppShell() {
  const { screen } = useApp()

  const showNav = TAB_SCREENS.has(screen)

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
        return <OrdersScreen />
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

  return (
    <>
      <div
        id="app-scroll"
        key={screen}
        className="no-scrollbar flex-1 overflow-y-auto animate-fade-in-up"
      >
        {content}
      </div>
      {showNav ? <BottomNav /> : null}
    </>
  )
}
