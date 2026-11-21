"use server"

import { createClient } from "@/lib/supabase/server"
import { isOrderStatus, type OrderStatus } from "@/lib/order-status"

export type CustomerTracking = {
  orderCode: string
  status: OrderStatus
  riderId: string | null
  riderName: string
  vendorName: string | null
  dropoffLocation: string | null
  dropoff: { lat: number; lng: number } | null
  deliveredAt: string | null
}

export type CustomerTrackingResult =
  | { data: CustomerTracking; error: null }
  | { data: null; error: "signed_out" | "not_found" | "failed" }

/** Live tracking details for one of the signed-in customer's own orders (RLS also enforces this). */
export async function getCustomerOrderForTracking(orderCode: string): Promise<CustomerTrackingResult> {
  const normalizedOrderCode = orderCode.trim()
  if (!normalizedOrderCode) return { data: null, error: "not_found" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "signed_out" }

  const { data: order, error } = await supabase
    .from("orders")
    .select("order_code, rider_id, status, dropoff_location, dropoff_lat, dropoff_lng, delivered_at, vendors(name)")
    .eq("user_id", user.id)
    .eq("order_code", normalizedOrderCode)
    .maybeSingle()

  if (error) {
    console.error("[tracking] failed to load order", error.code ?? error.message)
    return { data: null, error: "failed" }
  }
  if (!order || !isOrderStatus(order.status)) return { data: null, error: "not_found" }

  // Customers can't read other people's profiles under RLS, so this usually falls back to "Your rider".
  let riderName: string | null = null
  if (order.rider_id && (order.status === "assigned" || order.status === "picked_up")) {
    const { data: rider } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", order.rider_id)
      .maybeSingle()
    riderName = rider?.full_name?.trim() || null
  }

  const vendor = Array.isArray(order.vendors) ? order.vendors[0] : order.vendors
  const lat = order.dropoff_lat
  const lng = order.dropoff_lng

  return {
    data: {
      orderCode: order.order_code,
      status: order.status,
      riderId: order.rider_id,
      riderName: riderName ?? "Your rider",
      vendorName: (vendor as { name?: string } | null)?.name ?? null,
      dropoffLocation: order.dropoff_location?.trim() || null,
      dropoff: typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null,
      deliveredAt: order.delivered_at,
    },
    error: null,
  }
}
