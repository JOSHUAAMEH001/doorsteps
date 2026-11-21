import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const requestedNext = url.searchParams.get("next") ?? "/"
  // Only allow same-site relative paths to prevent open redirects.
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/"

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error("[auth/callback] code exchange failed", error.code ?? error.message)
        return NextResponse.redirect(new URL("/?auth=login", url.origin))
      }
    } catch (error) {
      console.error("[auth/callback] code exchange threw", error)
      return NextResponse.redirect(new URL("/?auth=login", url.origin))
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
