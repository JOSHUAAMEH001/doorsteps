'use server'

import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getVendors(category?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const loadCachedVendors = unstable_cache(
    async () => {
      let query = supabase
        .from('vendors')
        .select('id, name, category, image_url, rating, delivery_minutes, is_active')
        .eq('is_active', true)
        .order('name')
      if (category) query = query.eq('category', category)
      const { data, error } = await query
      if (error) {
        console.error("[catalog] Failed to load vendors", error)
        throw new Error("Could not load. Please refresh.")
      }
      return data ?? []
    },
    ['catalog-vendors', user?.id ?? 'anonymous', category ?? 'all'],
    { revalidate: 60 },
  )
  return loadCachedVendors()
}

export async function getMenuItem(id: string) {
  const supabase = await createClient()
  const columns = 'id, vendor_id, name, description, price, image_url, is_available'
  const withVideo = await supabase
    .from('menu_items')
    .select(`${columns}, video_url`)
    .eq('id', id)
    .eq('is_available', true)
    .single()
  // 42703 = video_url column not added yet; fall back so the product page still works.
  const { data, error } = withVideo.error?.code === '42703'
    ? await supabase.from('menu_items').select(columns).eq('id', id).eq('is_available', true).single()
        .then((r) => ({ ...r, data: r.data ? { ...r.data, video_url: null as string | null } : null }))
    : withVideo
  if (error) {
    console.error("[catalog] Failed to load menu item", error)
    throw new Error("Could not load. Please refresh.")
  }
  return data
}

export async function getMenuItems(vendorId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, vendor_id, name, description, price, image_url, is_available')
    .eq('vendor_id', vendorId)
    .eq('is_available', true)
    .order('price', { ascending: true })
  if (error) {
    console.error("[catalog] Failed to load menu items", error)
    throw new Error("Could not load. Please refresh.")
  }
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
