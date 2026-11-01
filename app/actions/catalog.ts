'use server'

import { createClient } from '@/lib/supabase/server'

export async function getVendors(category?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('vendors')
    .select('id, name, category, image_url, rating, delivery_minutes, is_active')
    .eq('is_active', true)
    .order('name')
  if (category) query = query.eq('category', category)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getMenuItem(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, vendor_id, name, description, price, image_url, is_available')
    .eq('id', id)
    .eq('is_available', true)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getMenuItems(vendorId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, vendor_id, name, description, price, image_url, is_available')
    .eq('vendor_id', vendorId)
    .eq('is_available', true)
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getMyOrders() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_code, vendor_id, total, status, created_at, vendors(name), order_items(item_name, unit_price, quantity)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}
