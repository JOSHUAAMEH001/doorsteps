import { AppProvider } from "@/lib/store"
import { getVendors } from "@/app/actions/catalog"
import { PhoneFrame } from "@/components/app/phone-frame"
import { AppShell } from "@/components/app/app-shell"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>
}) {
  const [{ auth }, initialVendors] = await Promise.all([searchParams, getVendors()])

  return (
    <AppProvider initialVendors={initialVendors} initialScreen={auth === "login" ? "auth" : "splash"}>
      <PhoneFrame>
        <AppShell />
      </PhoneFrame>
    </AppProvider>
  )
}
