'use server'

import { createClient } from '@/lib/supabase/server'

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
  if (!input.items.length || input.subtotal <= 0 || input.total <= 0) {
    return { ok: false, message: 'Your cart is empty. Add an item before placing an order.' }
  }

  try {
    const supabase = await createClient()
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: input.customerName.trim(),
        phone: input.phone.trim(),
        pickup_location: input.pickupLocation.trim(),
        dropoff_location: input.dropoffLocation.trim(),
        item_description: input.itemDescription.trim(),
        vendor_id: input.vendorId,
        subtotal: input.subtotal,
        delivery_fee: input.deliveryFee,
        total: input.total,
        payment_method: input.paymentMethod,
      })
      .select('id, order_code')
      .single()

    if (orderError || !order) {
      return { ok: false, message: orderError?.message ?? 'Order could not be created.' }
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      input.items.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menuItemId,
        item_name: item.itemName.trim(),
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
            text: [`Order: ${order.order_code}`, `Customer: ${input.customerName}`, `Phone: ${input.phone}`, `Items: ${input.items.map((item) => `${item.quantity}x ${item.itemName}`).join(', ')}`, `Total: ₦${input.total.toLocaleString('en-NG')}`, `Dropoff: ${input.dropoffLocation}`].join('\\n'),
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
