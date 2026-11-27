import { createClient } from "@supabase/supabase-js"

/**
 * Privileged Supabase client for trusted server code only (payment confirmation).
 * It bypasses Row Level Security, so it must never be imported by client components
 * and must only ever write what the server itself has verified.
 */
export function createAdminClient() {
  const url = process.env.APP_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
