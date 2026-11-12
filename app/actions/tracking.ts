"use server"

import { createClient } from "@/lib/supabase/server"

export async function getCustomerOrderForTracking(orderCode: string) {
  const normalizedOrderCode = orderCode.trim()
  if (!normalizedOrderCode) return { data: null, error: null }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: null }

  const { data: order, error } = await supabase
    .from("orders")
    .select("order_code, rider_id, status")
    .eq("user_id", user.id)
    .eq("order_code", normalizedOrderCode)
    .maybeSingle()

  if (error) return { data: null, error: "We couldn't load tracking details right now." }
  if (!order) return { data: null, error: null }

  let riderName: string | null = null
  if (order.rider_id && ["assigned", "picked_up"].includes(order.status)) {
    const { data: rider } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", order.rider_id)
      .maybeSingle()
    riderName = rider?.full_name?.trim() || null
  }

  return {
    data: {
      orderCode: order.order_code,
      riderId: order.rider_id,
      status: order.status,
      riderName: riderName ?? "Your rider",
    },
    error: null,
  }
}
