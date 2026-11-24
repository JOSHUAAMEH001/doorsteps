// DOORS "send-push" Edge Function.
//
// Delivers queued rows from public.notifications as Web Push messages to every device the
// person turned notifications on for (public.push_subscriptions).
//
// - Called by the database (public.push_kick(), via pg_net) right after notifications are
//   created. The call must carry the random secret stored in public.push_config.kick_secret,
//   so nobody else can trigger it. The request body is ignored: the function only ever sends
//   what is already queued in the database.
// - The first time it runs it creates the VAPID key pair (the app's push identity) and stores
//   it in public.push_config. The private key never leaves Supabase.
// - Uses the service role key that Supabase provides to Edge Functions automatically.
import { createClient } from "npm:@supabase/supabase-js@2.49.4"
import webpush from "npm:web-push@3.6.7"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const CONTACT = "https://www.doorsteps.com.ng"
const BATCH = 50
const MAX_ROUNDS = 6

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

type Config = { vapid_public_key: string | null; vapid_private_key: string | null; kick_secret: string }
type Job = { id: string; user_id: string; title: string; body: string; link: string | null; order_id: string | null }
type Subscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; failures: number }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

async function readConfig(): Promise<Config> {
  const { data, error } = await db.from("push_config").select("vapid_public_key, vapid_private_key, kick_secret").eq("id", true).single()
  if (error || !data) throw new Error(`push_config unavailable: ${error?.message ?? "no row"}`)
  return data as Config
}

/** Loads the config, creating the VAPID keys on the very first run. */
async function loadConfig(): Promise<Config> {
  const config = await readConfig()
  if (config.vapid_public_key && config.vapid_private_key) return config
  const keys = webpush.generateVAPIDKeys()
  // Only fills empty keys, so two runs at once can't overwrite each other.
  await db.from("push_config")
    .update({ vapid_public_key: keys.publicKey, vapid_private_key: keys.privateKey })
    .eq("id", true)
    .is("vapid_public_key", null)
  return await readConfig()
}

function sameSecret(given: string, expected: string) {
  if (!given || given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  try {
    const config = await loadConfig()
    if (req.method !== "POST" || !sameSecret(req.headers.get("x-doors-push-key") ?? "", config.kick_secret)) {
      return json({ ok: false, error: "unauthorized" }, 401)
    }
    webpush.setVapidDetails(CONTACT, config.vapid_public_key!, config.vapid_private_key!)

    let sent = 0
    let removed = 0
    let failed = 0
    let noDevice = 0
    const retry: string[] = []

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const { data, error } = await db.rpc("push_claim", { p_limit: BATCH })
      if (error) throw error
      const jobs = (data ?? []) as Job[]
      if (jobs.length === 0) break

      const userIds = [...new Set(jobs.map((job) => job.user_id))]
      const { data: subRows, error: subError } = await db
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth, failures")
        .in("user_id", userIds)
      if (subError) throw subError
      const subs = (subRows ?? []) as Subscription[]

      for (const job of jobs) {
        const targets = subs.filter((s) => s.user_id === job.user_id)
        if (targets.length === 0) { noDevice++; continue }
        const payload = JSON.stringify({ id: job.id, title: job.title, body: job.body, link: job.link ?? "/", tag: job.order_id ?? job.id })
        let anyTemporaryFailure = false
        await Promise.all(targets.map(async (s) => {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 60 * 60, urgency: "high" })
            sent++
            await db.from("push_subscriptions").update({ last_success_at: new Date().toISOString(), failures: 0 }).eq("id", s.id)
          } catch (error) {
            const status = (error as { statusCode?: number }).statusCode
            if (status === 404 || status === 410) {
              // The phone/browser has thrown this subscription away: forget it.
              removed++
              await db.from("push_subscriptions").delete().eq("id", s.id)
            } else {
              failed++
              anyTemporaryFailure = true
              console.error("[send-push] delivery failed", status, (error as Error).message)
              if (s.failures >= 19) await db.from("push_subscriptions").delete().eq("id", s.id)
              else await db.from("push_subscriptions").update({ failures: s.failures + 1 }).eq("id", s.id)
            }
          }
        }))
        if (anyTemporaryFailure) retry.push(job.id)
      }
      if (jobs.length < BATCH) break
    }

    // Temporary failures are tried again on the next run (at most 3 attempts, within a day).
    if (retry.length) await db.from("notifications").update({ pushed_at: null }).in("id", retry)

    return json({ ok: true, sent, removed, failed, noDevice })
  } catch (error) {
    console.error("[send-push] crashed", error)
    return json({ ok: false, error: "failed" }, 500)
  }
})
