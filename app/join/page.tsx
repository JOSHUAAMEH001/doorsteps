import type { Metadata } from "next"
import { LandingPage } from "@/components/landing/landing-page"

export const metadata: Metadata = {
  title: "DOORS: Food & groceries delivered around ESUT and Agbani",
  description:
    "DOORS connects you to local food and grocery vendors around ESUT and Agbani. Join the customer waitlist, register your business or apply to ride. Launching 6 December 2026.",
  alternates: { canonical: "/join" },
  openGraph: {
    title: "Agbani, something better is on the way.",
    description: "Food and groceries from local vendors around ESUT and Agbani, delivered. Join the DOORS waitlist, register your business or become a rider.",
    url: "/join",
    siteName: "DOORS",
    type: "website",
  },
}

export default function JoinPage() {
  return <LandingPage />
}
