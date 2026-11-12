import { AppProvider } from "@/lib/store"
import { PhoneFrame } from "@/components/app/phone-frame"
import { AppShell } from "@/components/app/app-shell"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>
}) {
  const { auth } = await searchParams

  return (
    <AppProvider initialScreen={auth === "login" ? "auth" : "splash"}>
      <PhoneFrame>
        <AppShell />
      </PhoneFrame>
    </AppProvider>
  )
}
