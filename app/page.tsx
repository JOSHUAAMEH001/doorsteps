import { AppProvider } from "@/lib/store"
import { getVendors } from "@/app/actions/catalog"
import { PhoneFrame } from "@/components/app/phone-frame"
import { AppShell } from "@/components/app/app-shell"

type Vendors = Awaited<ReturnType<typeof getVendors>>

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; track?: string }>
}) {
  const { auth, track } = await searchParams
  // "/?track=ORDER" opens that order's tracking screen (used after online payment).
  const trackCode = typeof track === "string" && /^[A-Za-z0-9-]{3,40}$/.test(track) ? track : null

  let initialVendors: Vendors = []
  try {
    initialVendors = await getVendors()
  } catch (error) {
    // Keep the app usable if Supabase is down; vendors can load later.
    console.error("[home] getVendors failed, rendering with no vendors", error)
  }

  return (
    <AppProvider
      initialVendors={initialVendors}
      initialScreen={trackCode ? "tracking" : auth === "login" ? "auth" : "splash"}
      initialParams={trackCode ? { orderCode: trackCode } : {}}
    >
      <PhoneFrame>
        <AppShell />
      </PhoneFrame>
    </AppProvider>
  )
}
