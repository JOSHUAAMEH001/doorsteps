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

export async function submitCheckout(input: CheckoutInput): Promise<OrderResult> {
  if (!input.items?.length || !input.vendorId || input.items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
    return { ok: false, message: 'Your cart is empty or contains an invalid quantity. Please review your cart.' }
  }

  try {
    const supabase = await createClient()
    const itemIds = [...new Set(input.items.map((item) => item.menuItemId))]
    const { data: liveItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, vendor_id, name, price, is_available')
      .in('id', itemIds)
      .eq('vendor_id', input.vendorId)
      .eq('is_available', true)

    if (menuError) {
      console.error('[orders] Failed to validate menu items', menuError)
      return { ok: false, message: 'Could not load. Please refresh.' }
    }
    if (!liveItems || liveItems.length !== itemIds.length) {
      return { ok: false, message: 'Some items are no longer available. Please refresh your cart.' }
    }
    const liveById = new Map(liveItems.map((item) => [item.id, item]))
    const orderItems = input.items.map((item) => {
      const live = liveById.get(item.menuItemId)!
      return { ...item, itemName: live.name, unitPrice: Number(live.price) }
    })
    const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const deliveryFee = Math.max(0, Number(input.deliveryFee) || 0)
    const total = subtotal + deliveryFee

    // Anything that isn't a finite coordinate inside Nigeria is stored as null.
    const dropoff = sanitizeDropoff(input.dropoffLat, input.dropoffLng)
    const dropoffNote = typeof input.dropoffNote === 'string' && input.dropoffNote.trim()
      ? input.dropoffNote.trim().slice(0, 300)
      : null

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: input.customerName.trim(),
        phone: input.phone.trim(),
        pickup_location: input.pickupLocation.trim(),
        dropoff_location: input.dropoffLocation.trim(),
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        dropoff_note: dropoffNote,
        item_description: input.itemDescription.trim(),
        vendor_id: input.vendorId,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        payment_method: input.paymentMethod,
      })
      .select('id, order_code')
      .single()

    if (orderError || !order) {
      return { ok: false, message: orderError?.message ?? 'Order could not be created.' }
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      orderItems.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menuItemId,
        item_name: item.itemName,
        unit_price: item.unitPrice,
        quantity: item.quantity,
      })),
    )

    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id)
      return { ok: false, message: itemsError.message }
    }

    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Doorsteps <onboarding@resend.dev>',
            to: ['amehjoshua031@gmail.com'],
            subject: `New Doorsteps order ${order.order_code}`,
            text: [`Order: ${order.order_code}`, `Customer: ${input.customerName}`, `Phone: ${input.phone}`, `Items: ${orderItems.map((item) => `${item.quantity}x ${item.itemName}`).join(', ')}`, `Total: ₦${total.toLocaleString('en-NG')}`, `Dropoff: ${input.dropoffLocation}`].join('\\n'),
          }),
        })
      } catch (emailError) {
        console.error('[v0] order email failed', emailError)
      }
    }

    return { ok: true, orderCode: order.order_code }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) }
  }
}
