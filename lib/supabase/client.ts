import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_APP_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_APP_SUPABASE_PUBLISHABLE_KEY!,
  )
}

/**
 * Client for the password-reset page only. It does not auto-read auth params from the URL,
 * so the page can verify the recovery link itself and never fall back to whatever session
 * happened to already be signed in on this browser.
 */
export function createRecoveryClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_APP_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_APP_SUPABASE_PUBLISHABLE_KEY!,
    { isSingleton: false, auth: { detectSessionInUrl: false } },
  )
}
