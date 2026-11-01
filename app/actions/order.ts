'use server'

import { createClient } from '@/lib/supabase/server'

export type OrderInput = {
  customerName: string
  phone: string
  pickupLocation: string
  dropOffLocation: string
  itemDescription: string
}

export type OrderResult =
  | { ok: true; orderCode: string }
  | { ok: false; message: string }

function getRequiredEnv(name: 'APP_SUPABASE_URL' | 'APP_SUPABASE_PUBLISHABLE_KEY') {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} environment variable`)
  return value
}

export async function submitOrder(input: OrderInput): Promise<OrderResult> {
  const values = Object.values(input).map((value) => value.trim())
  if (values.some((value) => !value)) {
    return { ok: false, message: 'Please complete all fields before submitting your order.' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { ok: false, message: 'Please log in before placing an order.' }
    }

    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        customer_name: input.customerName.trim(),
        phone: input.phone.trim(),
        pickup_location: input.pickupLocation.trim(),
        dropoff_location: input.dropOffLocation.trim(),
        item_description: input.itemDescription.trim(),
      })
      .select('order_code')
      .single()

    if (error) {
      console.error('[v0] Supabase order insert failed:', error)
      return {
        ok: false,
        message: `Supabase insert failed: ${error.message}`,
      }
    }

    if (!data?.order_code) {
      console.error('[v0] Supabase order insert returned no order code')
      return { ok: false, message: 'Order was saved, but no order code was returned.' }
    }

    return { ok: true, orderCode: data.order_code }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[v0] Order submission failed:', message)
    return { ok: false, message: `Order submission failed: ${message}` }
  }
}
