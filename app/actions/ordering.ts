"use server"

import { createClient } from "@/lib/supabase/server"

export type OrderingStatus = { ordersOpen: boolean; canOrder: boolean; message: string | null }

/**
 * Whether the current visitor may order right now (from public.ordering_status()).
 * Ordering is switched on/off in site_settings.orders_open; admins and tester emails can
 * still order while it is off. The database enforces this on every order anyway; the app
 * uses it to tell customers up front instead of failing at checkout.
 */
export async function getOrderingStatus(): Promise<OrderingStatus | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("ordering_status")
    if (error) {
      console.error("[ordering] status failed", error)
      return null
    }
    const row = (Array.isArray(data) ? data[0] : data) as { orders_open?: boolean; can_order?: boolean; message?: string | null } | null
    if (!row) return null
    return { ordersOpen: Boolean(row.orders_open), canOrder: Boolean(row.can_order), message: row.message ?? null }
  } catch (error) {
    console.error("[ordering] status crashed", error)
    return null
  }
}
