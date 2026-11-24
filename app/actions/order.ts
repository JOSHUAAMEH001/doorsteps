'use server'

import { createClient } from '@/lib/supabase/server'
import { sanitizeDropoff } from '@/lib/geo'

export type CheckoutItem = {
  menuItemId: string
  itemName: string
  unitPrice: number
  quantity: number
}

export type CheckoutInput = {
  /** One id per checkout attempt. Sending the same id again returns the same order (no duplicates). */
  requestId: string
  customerName: string
  phone: string
  pickupLocation: string
  dropoffLocation: string
  /** Pinned drop-off point. Only stored when it is a valid coordinate inside Nigeria. */
  dropoffLat?: number | null
  dropoffLng?: number | null
  /** Room / hostel / landmark and instructions for the rider. */
  dropoffNote?: string | null
  itemDescription: string
  vendorId: string
  /** Display-only. The server decides prices, the delivery fee and the total. */
  subtotal: number
  deliveryFee: number
  total: number
  paymentMethod: 'cash' | 'transfer' | 'card'
  items: CheckoutItem[]
}

export type OrderResult =
  | { ok: true; orderCode: string }
  | { ok: false; message: string }

export async function submitOrder(_input: unknown): Promise<OrderResult> {
  return { ok: false, message: 'Use the cart checkout to place an order.' }
}

/** Messages raised by our own database checks that are safe and useful to show customers. */
const FRIENDLY_DB_MESSAGES = [
  'DOORS has not launched yet. Ordering opens soon.',
  'This item is no longer available.',
  'This item does not belong to the selected restaurant.',
  'Quantity is too large.',
  'Each item must come from the menu.',
]

const refCode = () => Math.random().toString(36).slice(2, 8).toUpperCase()

/**
 * Places an order through the database function place_order(), which saves the order and
 * all its items in ONE transaction (all-or-nothing), returns the existing order if the same
 * checkout attempt is sent twice, and takes prices and the delivery fee from the server.
 */
export async function submitCheckout(input: CheckoutInput): Promise<OrderResult> {
  if (!input?.items?.length || !input.vendorId || input.items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50)) {
    return { ok: false, message: 'Your cart is empty or contains an invalid quantity. Please review your cart.' }
  }
  if (typeof input.requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.requestId)) {
    return { ok: false, message: 'Something is wrong with this checkout. Please refresh the page and try again.' }
  }

  const ref = refCode()
  try {
    const supabase = await createClient()
    const dropoff = sanitizeDropoff(input.dropoffLat, input.dropoffLng)
    const payload = {
      request_id: input.requestId,
      vendor_id: input.vendorId,
      customer_name: input.customerName,
      phone: input.phone,
      dropoff_location: input.dropoffLocation,
      dropoff_lat: dropoff.lat,
      dropoff_lng: dropoff.lng,
      dropoff_note: input.dropoffNote ?? null,
      payment_method: input.paymentMethod,
      items: input.items.map((item) => ({ menu_item_id: item.menuItemId, quantity: item.quantity })),
    }

    const { data, error } = await supabase.rpc('place_order', { p: payload })
    if (error) {
      console.error(`[orders] place_order failed ref=${ref}`, { code: error.code, message: error.message, details: error.details })
      if (FRIENDLY_DB_MESSAGES.includes(error.message)) return { ok: false, message: error.message }
      if (error.code === 'PGRST202' || error.code === '42883') {
        return { ok: false, message: `Ordering is being updated. Please try again in a few minutes. (Ref ${ref})` }
      }
      if (error.code === '22P02') return { ok: false, message: 'Some items in your cart are no longer valid. Please refresh your cart.' }
      return { ok: false, message: `We couldn't place your order. Your cart has been kept. Please try again. (Ref ${ref})` }
    }

    const result = (data ?? {}) as { ok?: boolean; duplicate?: boolean; order_code?: string; total?: number; error?: string }
    if (!result.ok || !result.order_code) {
      return { ok: false, message: result.error ?? `We couldn't place your order. Please try again. (Ref ${ref})` }
    }

    // Notify DOORS once per real new order (not when a retry returns the same order).
    if (!result.duplicate && process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Doorsteps <onboarding@resend.dev>',
            to: ['amehjoshua031@gmail.com'],
            subject: `New Doorsteps order ${result.order_code}`,
            text: [
              `Order: ${result.order_code}`,
              `Customer: ${input.customerName}`,
              `Phone: ${input.phone}`,
              `Items: ${input.items.map((item) => `${item.quantity}x ${item.itemName}`).join(', ')}`,
              `Total: ₦${Number(result.total ?? 0).toLocaleString('en-NG')}`,
              `Dropoff: ${input.dropoffLocation}`,
            ].join('\n'),
          }),
        })
      } catch (emailError) {
        console.error('[orders] order email failed', emailError)
      }
    }

    return { ok: true, orderCode: result.order_code }
  } catch (error) {
    console.error(`[orders] submitCheckout crashed ref=${ref}`, error)
    return { ok: false, message: `We couldn't reach our server. Your cart has been kept. Please try again. (Ref ${ref})` }
  }
}
