import { AppProvider } from "@/lib/store"
import { PhoneFrame } from "@/components/app/phone-frame"
import { AppShell } from "@/components/app/app-shell"

export default function Page() {
  return (
    <AppProvider>
      <PhoneFrame>
        <AppShell />
      </PhoneFrame>
    </AppProvider>
  )
}
