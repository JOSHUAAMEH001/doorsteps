import type { Metadata } from "next"
import Link from "next/link"
import { BrandLogo } from "@/components/brand/logo"

export const metadata: Metadata = {
  title: "Privacy notice | DOORS",
  description: "How Doorsteps Logistics (DOORS) handles information from waitlist sign-ups and vendor and rider applications.",
}

// NOTE FOR THE DOORS TEAM: plain-language notice written for the pre-launch forms.
// Have it reviewed (ideally against the Nigeria Data Protection Act 2023) and add
// a verified contact address before relying on it.
export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-[#F7F7F7] px-4 py-10 text-[#171717] sm:px-6">
      <article className="mx-auto max-w-2xl rounded-[28px] bg-white p-6 sm:p-10">
        <Link href="/join" aria-label="Back to DOORS"><BrandLogo tone="red" className="h-7" /></Link>
        <h1 className="mt-8 text-3xl font-extrabold tracking-tight">Privacy notice</h1>
        <p className="mt-2 text-sm text-[#737373]">Last updated 21 November 2026</p>
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-[#404040]">
          <section>
            <h2 className="text-lg font-extrabold text-[#171717]">Who we are</h2>
            <p className="mt-2">Doorsteps Logistics (&ldquo;DOORS&rdquo;) is a local food and grocery delivery platform serving ESUT, Agbani and the surrounding area in Enugu State, Nigeria.</p>
          </section>
          <section>
            <h2 className="text-lg font-extrabold text-[#171717]">What we collect</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Customer waitlist:</strong> your name, phone number, area, what you&apos;d like to order and, if you choose, your email, WhatsApp number and comments.</li>
              <li><strong>Vendor applications:</strong> business and owner details, contact details, location, opening hours, menu or product information and any photos you upload.</li>
              <li><strong>Rider applications:</strong> your name, contact details, area, vehicle and availability, an emergency contact and any documents you upload (such as ID, driver&apos;s licence or a photo).</li>
            </ul>
            <p className="mt-2">We also keep a short, scrambled code derived from your network address for one day, only to block spam. We don&apos;t store your IP address.</p>
          </section>
          <section>
            <h2 className="text-lg font-extrabold text-[#171717]">How we use it</h2>
            <p className="mt-2">Only to manage the waitlist, review applications, contact you about joining DOORS and prepare for launch. We don&apos;t sell your information or share it with advertisers.</p>
          </section>
          <section>
            <h2 className="text-lg font-extrabold text-[#171717]">How we protect it</h2>
            <p className="mt-2">Submissions are stored in a secured database that only authorised DOORS administrators can read. Uploaded documents are kept in private storage. They are never published, and admins can only open them through short-lived secure links.</p>
          </section>
          <section>
            <h2 className="text-lg font-extrabold text-[#171717]">How long we keep it</h2>
            <p className="mt-2">We keep waitlist details until launch communications are complete or you ask us to remove them. Applications that don&apos;t proceed are deleted after a reasonable review period.</p>
          </section>
          <section>
            <h2 className="text-lg font-extrabold text-[#171717]">Your choices</h2>
            <p className="mt-2">You can ask us to show, correct or delete your information at any time. Reply to any message from DOORS, or ask when we contact you.</p>
          </section>
        </div>
        <Link href="/join" className="mt-10 inline-flex min-h-12 items-center rounded-2xl bg-[#171717] px-5 text-sm font-bold text-white">Back to DOORS</Link>
      </article>
    </main>
  )
}
