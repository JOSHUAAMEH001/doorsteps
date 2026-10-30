'use server'

import { createClient } from '@supabase/supabase-js'

export type OrderInput = {
  customerName: string
  phone: string
  pickupLocation: string
  dropOffLocation: string
  itemDescription: string
}

export type OrderResult =
  | { ok: true }
  | { ok: false; message: string }

function getRequiredEnv(name: 'SUPABASE_URL' | 'SUPABASE_PUBLISHABLE_KEY') {
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
    const supabase = createClient(
      getRequiredEnv('SUPABASE_URL'),
      getRequiredEnv('SUPABASE_PUBLISHABLE_KEY'),
    )

    const { error } = await supabase.from('orders').insert({
      customer_name: input.customerName.trim(),
      phone: input.phone.trim(),
      pickup_location: input.pickupLocation.trim(),
      drop_off_location: input.dropOffLocation.trim(),
      item_description: input.itemDescription.trim(),
    })

    if (error) {
      console.error('[v0] Supabase order insert failed:', error)
      return {
        ok: false,
        message: `Supabase insert failed: ${error.message}`,
      }
    }

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[v0] Order submission failed:', message)
    return { ok: false, message: `Order submission failed: ${message}` }
  }
}
