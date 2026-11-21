import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/** Finishes email links that use ?code= (e.g. sign-up confirmation). */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const rawNext = url.searchParams.get("next") ?? "/"
  // Only allow same-site paths, so the link can't be abused to redirect elsewhere.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      // Link opened in a different browser, already used, or expired: go to login, not a blank home.
      return NextResponse.redirect(new URL("/?auth=login", url.origin))
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
