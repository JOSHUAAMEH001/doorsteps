import { Bricolage_Grotesque } from "next/font/google"
import type { ReactNode } from "react"

// Display typeface for the landing page only, so the rest of the app is unaffected.
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" })

export default function JoinLayout({ children }: { children: ReactNode }) {
  return <div className={bricolage.variable}>{children}</div>
}
