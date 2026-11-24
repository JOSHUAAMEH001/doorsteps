"use server"

import { createClient } from "@/lib/supabase/server"

export type AppNotificationRow = {
  id: string
  title: string
  body: string
  link: string | null
  created_at: string
  read_at: string | null
}

export type NotificationsResult = { items: AppNotificationRow[]; error: string | null }

/** Missing table/function: the database change isn't applied yet. Treat as "nothing yet". */
function notReady(code?: string) {
  return code === "42P01" || code === "PGRST205" || code === "42883" || code === "PGRST202"
}

/** The signed-in person's 50 most recent notifications (RLS: only their own). */
export async function getMyNotifications(): Promise<NotificationsResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { items: [], error: null }
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, link, created_at, read_at")
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) {
      if (notReady(error.code)) return { items: [], error: null }
      console.error("[notifications] list failed", error)
      return { items: [], error: "We couldn't load your notifications." }
    }
    return { items: (data ?? []) as AppNotificationRow[], error: null }
  } catch (error) {
    console.error("[notifications] list crashed", error)
    return { items: [], error: "We couldn't load your notifications." }
  }
}

/** How many unread notifications the signed-in person has (0 if signed out). */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

/** Marks some (or, with no ids, all) of the signed-in person's notifications as read. */
export async function markNotificationsRead(ids?: string[]): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient()
    const clean = ids?.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100)
    const { error } = await supabase.rpc("mark_my_notifications_read", { p_ids: clean && clean.length ? clean : null })
    if (error && !notReady(error.code)) console.error("[notifications] mark read failed", error)
    return { ok: !error }
  } catch (error) {
    console.error("[notifications] mark read crashed", error)
    return { ok: false }
  }
}

/** The app's public push key (safe to share; the private half stays in Supabase). */
export async function getPushPublicKey(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("push_public_key")
    if (error || typeof data !== "string" || !data) return null
    return data
  } catch {
    return null
  }
}

export type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } }

/** Registers this device to receive notifications for the signed-in person. */
export async function savePushSubscription(subscription: PushSubscriptionInput, userAgent?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Please log in again." }
    const { error } = await supabase.rpc("save_push_subscription", {
      p_endpoint: String(subscription?.endpoint ?? ""),
      p_p256dh: String(subscription?.keys?.p256dh ?? ""),
      p_auth: String(subscription?.keys?.auth ?? ""),
      p_user_agent: userAgent ? String(userAgent).slice(0, 300) : null,
    })
    if (error) {
      console.error("[push] save subscription failed", error)
      if (notReady(error.code)) return { ok: false, error: "Notifications aren't switched on yet. Please try again later." }
      return { ok: false, error: "We couldn't turn on notifications. Please try again." }
    }
    return { ok: true }
  } catch (error) {
    console.error("[push] save subscription crashed", error)
    return { ok: false, error: "We couldn't turn on notifications. Please try again." }
  }
}

/** Stops sending this person's notifications to this device. */
export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc("remove_push_subscription", { p_endpoint: String(endpoint ?? "") })
    if (error && !notReady(error.code)) console.error("[push] remove subscription failed", error)
    return { ok: !error }
  } catch {
    return { ok: false }
  }
}
