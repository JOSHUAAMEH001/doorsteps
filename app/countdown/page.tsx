import type { Metadata } from "next"
import CountdownClient from "./countdown-client"

export const metadata: Metadata = {
  title: "DOORS — We launch on December 6th",
  robots: { index: false, follow: false },
}

export default function CountdownPage() {
  return <CountdownClient />
}
