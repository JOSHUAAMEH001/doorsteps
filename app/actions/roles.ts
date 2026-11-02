'use server'

import { createClient } from '@/lib/supabase/server'

export type Role = 'customer' | 'vendor' | 'rider' | 'admin'
export type SafeResult<T> = { data: T; error: string | null }

async function client() { return createClient() }

export async function getCurrentProfile(): Promise<SafeResult<{ id: string; email: string; role: Role; vendor_id: string | null } | null>> {
  try {
    const supabase = await client()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { data: null, error: authError?.message ?? null }
    const { data, error } = await supabase.from('profiles').select('id, email, role, vendor_id').eq('id', user.id).maybeSingle()
    return { data: data as { id: string; email: string; role: Role; vendor_id: string | null } | null, error: error?.message ?? null }
  } catch (error) { return { data: null, error: error instanceof Error ? error.message : String(error) } }
}

export async function getVendorOrders(): Promise<SafeResult<unknown[]>> {
  try { const supabase = await client(); const { data, error } = await supabase.from('orders').select('id, order_code, created_at, customer_name, phone, dropoff_location, status, total, payment_method, vendor_id, order_items(item_name, unit_price, quantity)').order('created_at', { ascending: false }); return { data: data ?? [], error: error?.message ?? null } } catch (error) { return { data: [], error: error instanceof Error ? error.message : String(error) } }
}

export async function updateOrderStatus(id: string, status: string): Promise<SafeResult<null>> {
  try { const supabase = await client(); const { error } = await supabase.from('orders').update({ status }).eq('id', id); return { data: null, error: error?.message ?? null } } catch (error) { return { data: null, error: error instanceof Error ? error.message : String(error) } }
}

export async function getRiderOrders(): Promise<SafeResult<unknown[]>> {
  try {
    const supabase = await client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], error: 'Please log in again.' }
    const { data: declines, error: declineError } = await supabase.from('order_declines').select('order_id').eq('rider_id', user.id)
    if (declineError) return { data: [], error: declineError.message }
    const declinedIds = (declines ?? []).map((row) => row.order_id)
    let query = supabase.from('orders').select('id, order_code, created_at, customer_name, phone, pickup_location, dropoff_location, status, total, delivery_fee, rider_id, rider_earning, order_items(item_name, unit_price, quantity), vendors(name)').order('created_at', { ascending: false })
    query = query.or(`rider_id.eq.${user.id},and(status.eq.confirmed,rider_id.is.null)`)
    const { data, error } = await query
    if (error) return { data: [], error: error.message }
    return { data: (data ?? []).filter((order) => order.rider_id === user.id || !declinedIds.includes(order.id)), error: null }
  } catch (error) { return { data: [], error: error instanceof Error ? error.message : String(error) } }
}

export async function acceptRiderOrder(id: string): Promise<SafeResult<null>> {
  try {
    const supabase = await client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Please log in again.' }
    const { data, error } = await supabase.from('orders').update({ rider_id: user.id, status: 'assigned' }).eq('id', id).eq('status', 'confirmed').is('rider_id', null).select('id').maybeSingle()
    if (error) return { data: null, error: error.message }
    return data ? { data: null, error: null } : { data: null, error: 'Order already taken' }
  } catch (error) { return { data: null, error: error instanceof Error ? error.message : String(error) } }
}

export async function declineRiderOrder(id: string): Promise<SafeResult<null>> {
  try {
    const supabase = await client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Please log in again.' }
    const { error } = await supabase.from('order_declines').insert({ order_id: id, rider_id: user.id })
    return { data: null, error: error?.message ?? null }
  } catch (error) { return { data: null, error: error instanceof Error ? error.message : String(error) } }
}

export async function updateRiderOrderStatus(id: string, status: 'picked_up' | 'delivered'): Promise<SafeResult<null>> {
  try {
    const supabase = await client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Please log in again.' }
    const values = status === 'delivered' ? { status, delivered_at: new Date().toISOString() } : { status }
    const { data, error } = await supabase.from('orders').update(values).eq('id', id).eq('rider_id', user.id).select('id').maybeSingle()
    if (error) return { data: null, error: error.message }
    return data ? { data: null, error: null } : { data: null, error: 'Order is no longer assigned to you.' }
  } catch (error) { return { data: null, error: error instanceof Error ? error.message : String(error) } }
}

export async function getRiderEarnings(): Promise<SafeResult<unknown[]>> {
  try { const supabase = await client(); const { data, error } = await supabase.from('rider_daily_earnings').select('rider_id, day, deliveries, earnings').order('day', { ascending: false }); return { data: data ?? [], error: error?.message ?? null } } catch (error) { return { data: [], error: error instanceof Error ? error.message : String(error) } }
}

export async function getAdminData(): Promise<SafeResult<{ orders: unknown[]; riders: unknown[] }>> {
  try { const supabase = await client(); const [orders, riders] = await Promise.all([supabase.from('orders').select('id, order_code, created_at, customer_name, status, total, delivery_fee, rider_id, vendors(name)').order('created_at', { ascending: false }), supabase.from('profiles').select('id, email').eq('role', 'rider').order('email')]); return { data: { orders: orders.data ?? [], riders: riders.data ?? [] }, error: orders.error?.message ?? riders.error?.message ?? null } } catch (error) { return { data: { orders: [], riders: [] }, error: error instanceof Error ? error.message : String(error) } }
}

export async function assignRider(orderId: string, riderId: string): Promise<SafeResult<null>> {
  try { const supabase = await client(); const { error } = await supabase.from('orders').update({ rider_id: riderId, status: 'assigned' }).eq('id', orderId); return { data: null, error: error?.message ?? null } } catch (error) { return { data: null, error: error instanceof Error ? error.message : String(error) } }
}

export async function getAdminOrders(): Promise<SafeResult<unknown[]>> {
  try { const supabase = await client(); const { data, error } = await supabase.from('orders').select('id, order_code, customer_name, total, status, created_at, vendors(name)').order('created_at', { ascending: false }); return { data: data ?? [], error: error?.message ?? null } } catch (error) { return { data: [], error: error instanceof Error ? error.message : String(error) } }
}
