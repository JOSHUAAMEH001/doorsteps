'use server'

import { createClient } from '@/lib/supabase/server'
import { adminAssignRider, adminUpdateOrderStatus, vendorRespondToOrder } from '@/app/actions/dashboard'
import { RIDER_PREVIOUS } from '@/lib/order-status'

export type Role = 'customer' | 'vendor' | 'rider' | 'admin'
export type SafeResult<T> = { data: T; error: string | null }

async function client() { return createClient() }

/** Only real riders may take rider actions. Admins get a clear message (they preview read-only). */
async function getRiderActionUser(supabase: Awaited<ReturnType<typeof client>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, error: 'Please log in again.' }
  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (error) return { user: null, error: 'We couldn\'t verify your account. Please try again.' }
  if (profile?.role === 'admin') return { user: null, error: 'Admin accounts can\'t perform rider actions.' }
  if (profile?.role !== 'rider') return { user: null, error: 'You don\'t have permission to do that.' }
  return { user, error: null }
}

export type CurrentProfile = {
  id: string
  email: string
  full_name: string | null
  role: Role
  vendor_id: string | null
  /** Saved as 234XXXXXXXXXX. Null until the customer adds one. */
  phone: string | null
  avatar_url: string | null
}

export async function getCurrentProfile(): Promise<SafeResult<CurrentProfile | null>> {
  try {
    const supabase = await client()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { data: null, error: authError?.message ?? null }
    const { data, error } = await supabase.from('profiles').select('id, email, full_name, role, vendor_id, phone, avatar_url').eq('id', user.id).maybeSingle()
    // 42703 = a column doesn't exist yet (database change not applied): load what's there.
    if (error?.code === '42703') {
      const { data: base, error: fallbackError } = await supabase.from('profiles').select('id, email, role, vendor_id').eq('id', user.id).maybeSingle()
      const fallbackData: CurrentProfile | null = base
        ? { ...(base as Omit<CurrentProfile, "full_name" | "phone" | "avatar_url">), full_name: null, phone: null, avatar_url: null }
        : null
      if (fallbackData) {
        const { data: named } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
        fallbackData.full_name = (named as { full_name?: string | null } | null)?.full_name ?? null
      }
      return { data: fallbackData as CurrentProfile | null, error: fallbackError?.message ?? null }
    }
    return { data: data as CurrentProfile | null, error: error?.message ?? null }
  } catch (error) { return { data: null, error: error instanceof Error ? error.message : String(error) } }
}

export async function getVendorOrders(): Promise<SafeResult<unknown[]>> {
  try { const supabase = await client(); const { data, error } = await supabase.from('orders').select('id, order_code, created_at, customer_name, phone, dropoff_location, status, total, payment_method, vendor_id, order_items(item_name, unit_price, quantity)').order('created_at', { ascending: false }); return { data: data ?? [], error: error?.message ?? null } } catch (error) { return { data: [], error: error instanceof Error ? error.message : String(error) } }
}

/**
 * Legacy entry point kept for compatibility. Routes to the role-checked,
 * workflow-enforcing actions in ./dashboard so no caller can bypass them.
 */
export async function updateOrderStatus(id: string, status: string): Promise<SafeResult<null>> {
  const profile = await getCurrentProfile()
  const role = profile.data?.role
  if (role === 'admin') return adminUpdateOrderStatus(id, status)
  if (role === 'vendor' && (status === 'confirmed' || status === 'cancelled')) {
    return vendorRespondToOrder(id, status === 'confirmed' ? 'accept' : 'reject')
  }
  return { data: null, error: "You don't have permission to do that." }
}

export async function getRiderOrders(): Promise<SafeResult<unknown[]>> {
  try {
    const supabase = await client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], error: 'Please log in again.' }
    const [declinesResult, ordersResult] = await Promise.all([
      supabase.from('order_declines').select('order_id').eq('rider_id', user.id),
      supabase.from('orders').select('id, order_code, created_at, customer_name, phone, pickup_location, dropoff_location, status, total, delivery_fee, rider_id, rider_earning, order_items(item_name, unit_price, quantity), vendors(name)').order('created_at', { ascending: false }).or(`rider_id.eq.${user.id},and(status.eq.confirmed,rider_id.is.null)`),
    ])
    const { data: declines, error: declineError } = declinesResult
    if (declineError) return { data: [], error: declineError.message }
    const declinedIds = (declines ?? []).map((row) => row.order_id)
    const { data, error } = ordersResult
    if (error) return { data: [], error: error.message }
    return { data: (data ?? []).filter((order) => order.rider_id === user.id || !declinedIds.includes(order.id)), error: null }
  } catch (error) { return { data: [], error: error instanceof Error ? error.message : String(error) } }
}

export async function acceptRiderOrder(id: string): Promise<SafeResult<null>> {
  try {
    const supabase = await client()
    const { user, error: userError } = await getRiderActionUser(supabase)
    if (userError || !user) return { data: null, error: userError }
    const { data, error } = await supabase.from('orders').update({ rider_id: user.id, status: 'assigned' }).eq('id', id).eq('status', 'confirmed').is('rider_id', null).select('id').maybeSingle()
    if (error) return { data: null, error: error.message }
    return data ? { data: null, error: null } : { data: null, error: 'Order already taken' }
  } catch (error) { return { data: null, error: error instanceof Error ? error.message : String(error) } }
}

export async function declineRiderOrder(id: string): Promise<SafeResult<null>> {
  try {
    const supabase = await client()
    const { user, error: userError } = await getRiderActionUser(supabase)
    if (userError || !user) return { data: null, error: userError }
    const { error } = await supabase.from('order_declines').insert({ order_id: id, rider_id: user.id })
    return { data: null, error: error?.message ?? null }
  } catch (error) { return { data: null, error: error instanceof Error ? error.message : String(error) } }
}

export async function updateRiderOrderStatus(id: string, status: 'picked_up' | 'delivered'): Promise<SafeResult<null>> {
  try {
    const supabase = await client()
    const { user, error: userError } = await getRiderActionUser(supabase)
    if (userError || !user) return { data: null, error: userError }
    if (status !== 'picked_up' && status !== 'delivered') return { data: null, error: 'Unknown status.' }
    const values = status === 'delivered' ? { status, delivered_at: new Date().toISOString() } : { status }
    // Enforce the workflow: picked up only after assigned, delivered only after picked up.
    const { data, error } = await supabase.from('orders').update(values).eq('id', id).eq('rider_id', user.id).eq('status', RIDER_PREVIOUS[status]).select('id').maybeSingle()
    if (error) return { data: null, error: error.message }
    return data ? { data: null, error: null } : { data: null, error: 'This order is no longer at that step, or no longer assigned to you. Refreshing…' }
  } catch (error) { return { data: null, error: error instanceof Error ? error.message : String(error) } }
}

export async function getRiderEarnings(): Promise<SafeResult<unknown[]>> {
  try { const supabase = await client(); const { data, error } = await supabase.from('rider_daily_earnings').select('rider_id, day, deliveries, earnings').order('day', { ascending: false }); return { data: data ?? [], error: error?.message ?? null } } catch (error) { return { data: [], error: error instanceof Error ? error.message : String(error) } }
}

export async function getAdminData(): Promise<SafeResult<{ orders: unknown[]; riders: unknown[] }>> {
  const profile = await getCurrentProfile()
  if (profile.data?.role !== 'admin') return { data: { orders: [], riders: [] }, error: "You don't have permission to view this." }
  try { const supabase = await client(); const [orders, riders] = await Promise.all([supabase.from('orders').select('id, order_code, created_at, customer_name, status, total, delivery_fee, rider_id, vendors(name)').order('created_at', { ascending: false }), supabase.from('profiles').select('id, email').eq('role', 'rider').order('email')]); return { data: { orders: orders.data ?? [], riders: riders.data ?? [] }, error: orders.error?.message ?? riders.error?.message ?? null } } catch (error) { return { data: { orders: [], riders: [] }, error: error instanceof Error ? error.message : String(error) } }
}

export async function assignRider(orderId: string, riderId: string): Promise<SafeResult<null>> {
  return adminAssignRider(orderId, riderId)
}

export async function getAdminOrders(): Promise<SafeResult<unknown[]>> {
  const profile = await getCurrentProfile()
  if (profile.data?.role !== 'admin') return { data: [], error: "You don't have permission to view this." }
  try { const supabase = await client(); const { data, error } = await supabase.from('orders').select('id, order_code, customer_name, total, status, created_at, vendors(name)').order('created_at', { ascending: false }); return { data: data ?? [], error: error?.message ?? null } } catch (error) { return { data: [], error: error instanceof Error ? error.message : String(error) } }
}
