import { AppProvider } from "@/lib/store"
import { getVendors } from "@/app/actions/catalog"
import { PhoneFrame } from "@/components/app/phone-frame"
import { AppShell } from "@/components/app/app-shell"

type Vendors = Awaited<ReturnType<typeof getVendors>>

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>
}) {
  const { auth } = await searchParams

  let initialVendors: Vendors = []
  try {
    initialVendors = await getVendors()
  } catch (error) {
    // Keep the app usable if Supabase is down; vendors can load later.
    console.error("[home] getVendors failed, rendering with no vendors", error)
  }

  return (
    <AppProvider initialVendors={initialVendors} initialScreen={auth === "login" ? "auth" : "splash"}>
      <PhoneFrame>
        <AppShell />
      </PhoneFrame>
    </AppProvider>
  )
}
