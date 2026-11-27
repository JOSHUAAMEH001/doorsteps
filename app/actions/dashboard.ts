"use server"

import { createClient } from "@/lib/supabase/server"
import { confirmSquadPayment } from "@/lib/payments/squad-confirm"
import type { Role } from "@/app/actions/roles"
import { ADMIN_TRANSITIONS, isOrderStatus, type OrderStatus } from "@/lib/order-status"

/**
 * Dashboard server actions.
 *
 * Every action re-checks the caller's role on the server before touching data.
 * Supabase RLS and the `orders_guard` trigger remain the final line of defence;
 * these checks add defence in depth and enforce the order status workflow,
 * which the database does not currently enforce on its own.
 */

export type ActionResult<T = null> = { data: T; error: string | null }

const GENERIC_ERROR = "Something went wrong. Please try again."

type Caller = { supabase: Awaited<ReturnType<typeof createClient>>; userId: string; role: Role; vendorId: string | null }

async function requireRole(allowed: Role[]): Promise<Caller | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Please log in again." }
  const { data: profile, error } = await supabase.from("profiles").select("role, vendor_id").eq("id", user.id).maybeSingle()
  if (error) {
    console.error("[dashboard] profile lookup failed", error)
    return { error: GENERIC_ERROR }
  }
  const role = profile?.role as Role | undefined
  if (!role || !allowed.includes(role)) return { error: "You don't have permission to do that." }
  return { supabase, userId: user.id, role, vendorId: (profile?.vendor_id as string | null) ?? null }
}

function fail<T>(data: T, error: unknown, context: string): ActionResult<T> {
  console.error(`[dashboard] ${context}`, error)
  return { data, error: GENERIC_ERROR }
}

/* ----------------------------------------------------------------------------
 * Admin
 * ------------------------------------------------------------------------- */

export type AdminOrder = {
  id: string
  order_code: string
  created_at: string
  customer_name: string
  phone: string
  pickup_location: string | null
  dropoff_location: string
  status: OrderStatus
  total: number | null
  delivery_fee: number | null
  rider_earning: number | null
  payment_method: string | null
  payment_status: string | null
  payment_reference: string | null
  paid_at: string | null
  user_id: string | null
  rider_id: string | null
  vendor_id: string | null
  delivered_at: string | null
  vendors: { name: string } | null
}

export type AdminPerson = { id: string; email: string | null; full_name: string | null; role: Role; vendor_id: string | null; created_at: string | null }
export type RiderLocationRow = { rider_id: string; lat: number; lng: number; updated_at: string }
export type VendorRow = { id: string; name: string; category: string; is_active: boolean; rating: number | null; delivery_minutes: number | null; created_at: string }

export type AdminWorkspace = {
  orders: AdminOrder[]
  people: AdminPerson[]
  locations: RiderLocationRow[]
  vendors: VendorRow[]
  declines: { order_id: string; rider_id: string; created_at: string }[]
}

const EMPTY_ADMIN: AdminWorkspace = { orders: [], people: [], locations: [], vendors: [], declines: [] }

export async function getAdminWorkspace(): Promise<ActionResult<AdminWorkspace>> {
  const caller = await requireRole(["admin"])
  if ("error" in caller) return { data: EMPTY_ADMIN, error: caller.error }
  try {
    const { supabase } = caller
    const [orders, people, locations, vendors, declines] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_code, created_at, customer_name, phone, pickup_location, dropoff_location, status, total, delivery_fee, rider_earning, payment_method, payment_status, payment_reference, paid_at, user_id, rider_id, vendor_id, delivered_at, vendors(name)")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("profiles").select("id, email, full_name, role, vendor_id, created_at").order("created_at", { ascending: false }),
      supabase.from("rider_locations").select("rider_id, lat, lng, updated_at"),
      // RLS currently exposes only active vendors; inactive ones need an admin policy (see migration).
      supabase.from("vendors").select("id, name, category, is_active, rating, delivery_minutes, created_at").order("name"),
      supabase.from("order_declines").select("order_id, rider_id, created_at"),
    ])
    const firstError = orders.error ?? people.error ?? locations.error ?? vendors.error ?? declines.error
    if (firstError) return fail(EMPTY_ADMIN, firstError, "admin workspace query failed")
    return {
      data: {
        orders: (orders.data ?? []).map((row) => ({ ...row, vendors: Array.isArray(row.vendors) ? row.vendors[0] ?? null : row.vendors })) as AdminOrder[],
        people: (people.data ?? []) as AdminPerson[],
        locations: (locations.data ?? []) as RiderLocationRow[],
        vendors: (vendors.data ?? []) as VendorRow[],
        declines: declines.data ?? [],
      },
      error: null,
    }
  } catch (error) {
    return fail(EMPTY_ADMIN, error, "admin workspace crashed")
  }
}

export async function adminUpdateOrderStatus(orderId: string, nextStatus: string): Promise<ActionResult> {
  const caller = await requireRole(["admin"])
  if ("error" in caller) return { data: null, error: caller.error }
  if (!isOrderStatus(nextStatus)) return { data: null, error: "Unknown status." }
  try {
    const { supabase } = caller
    const { data: order, error } = await supabase.from("orders").select("status, rider_id").eq("id", orderId).maybeSingle()
    if (error) return fail(null, error, "admin status lookup failed")
    if (!order) return { data: null, error: "Order not found." }
    const current = order.status as OrderStatus
    if (current === nextStatus) return { data: null, error: null }
    if (!ADMIN_TRANSITIONS[current]?.includes(nextStatus)) {
      return { data: null, error: `An order can't move from "${current.replace("_", " ")}" to "${nextStatus.replace("_", " ")}".` }
    }
    if (["assigned", "picked_up", "delivered"].includes(nextStatus) && !order.rider_id) {
      return { data: null, error: "Assign a rider first." }
    }
    const values: Record<string, unknown> = { status: nextStatus }
    // Moving back to "open" releases the rider so another can accept it.
    if (nextStatus === "confirmed" || nextStatus === "pending") values.rider_id = null
    if (nextStatus !== "delivered") values.delivered_at = null
    const { data: updated, error: updateError } = await supabase
      .from("orders").update(values).eq("id", orderId).eq("status", current).select("id").maybeSingle()
    if (updateError) return fail(null, updateError, "admin status update failed")
    return updated ? { data: null, error: null } : { data: null, error: "This order changed while you were editing. Refresh and try again." }
  } catch (error) {
    return fail(null, error, "admin status update crashed")
  }
}

export async function adminAssignRider(orderId: string, riderId: string): Promise<ActionResult> {
  const caller = await requireRole(["admin"])
  if ("error" in caller) return { data: null, error: caller.error }
  try {
    const { supabase } = caller
    const [{ data: rider, error: riderError }, { data: order, error: orderError }] = await Promise.all([
      supabase.from("profiles").select("id, role").eq("id", riderId).maybeSingle(),
      supabase.from("orders").select("status").eq("id", orderId).maybeSingle(),
    ])
    if (riderError || orderError) return fail(null, riderError ?? orderError, "assign lookup failed")
    if (!rider || rider.role !== "rider") return { data: null, error: "That person isn't a rider." }
    if (!order) return { data: null, error: "Order not found." }
    if (!["confirmed", "assigned", "picked_up"].includes(order.status)) {
      return { data: null, error: "Only accepted or in-progress orders can be assigned." }
    }
    // Reassigning keeps a picked-up order picked up; otherwise it becomes "assigned".
    const status = order.status === "picked_up" ? "picked_up" : "assigned"
    const { error } = await supabase.from("orders").update({ rider_id: riderId, status }).eq("id", orderId).eq("status", order.status)
    if (error) return fail(null, error, "assign rider failed")
    return { data: null, error: null }
  } catch (error) {
    return fail(null, error, "assign rider crashed")
  }
}

/** Lightweight list of stores and riders an admin can preview. */
export async function getPreviewTargets(): Promise<ActionResult<{ vendors: { id: string; name: string }[]; riders: { id: string; name: string }[] }>> {
  const empty = { vendors: [], riders: [] }
  const caller = await requireRole(["admin"])
  if ("error" in caller) return { data: empty, error: caller.error }
  try {
    const [vendors, riders] = await Promise.all([
      caller.supabase.from("vendors").select("id, name").order("name"),
      caller.supabase.from("profiles").select("id, full_name, email").eq("role", "rider").order("created_at"),
    ])
    if (vendors.error || riders.error) return fail(empty, vendors.error ?? riders.error, "preview targets failed")
    return {
      data: {
        vendors: vendors.data ?? [],
        riders: (riders.data ?? []).map((r) => ({ id: r.id, name: r.full_name?.trim() || r.email?.split("@")[0] || "Rider" })),
      },
      error: null,
    }
  } catch (error) {
    return fail(empty, error, "preview targets crashed")
  }
}

/* ----------------------------------------------------------------------------
 * Vendor
 * ------------------------------------------------------------------------- */

export type VendorOrder = {
  id: string
  order_code: string
  created_at: string
  customer_name: string
  phone: string
  dropoff_location: string
  item_description: string | null
  status: OrderStatus
  subtotal: number | null
  total: number | null
  payment_method: string | null
  payment_status: string | null
  rider_id: string | null
  delivered_at: string | null
  order_items: { item_name: string; unit_price: number; quantity: number }[]
}

export type VendorMenuItem = { id: string; name: string; description: string | null; price: number; image_url: string | null; video_url: string | null; is_available: boolean; category: string | null; stock_quantity: number | null }

export type VendorWorkspace = {
  vendor: VendorRow | null
  orders: VendorOrder[]
  menu: VendorMenuItem[]
}

const EMPTY_VENDOR: VendorWorkspace = { vendor: null, orders: [], menu: [] }

const MENU_COLUMNS = "id, name, description, price, image_url, is_available, category, stock_quantity"

/** Postgres "undefined column": the video_url migration hasn't been applied yet. */
function isMissingColumn(error: { code?: string } | null | undefined) {
  return error?.code === "42703"
}

async function loadMenu(supabase: Caller["supabase"], vendorId: string) {
  const withVideo = await supabase.from("menu_items").select(`${MENU_COLUMNS}, video_url`).eq("vendor_id", vendorId).order("name")
  if (!isMissingColumn(withVideo.error)) return withVideo
  const plain = await supabase.from("menu_items").select(MENU_COLUMNS).eq("vendor_id", vendorId).order("name")
  return { ...plain, data: (plain.data ?? []).map((row) => ({ ...row, video_url: null as string | null })) }
}

/** Public URL prefix for files a vendor uploaded into their own folder. */
function vendorMediaPrefix(vendorId: string) {
  const base = (process.env.APP_SUPABASE_URL ?? process.env.NEXT_PUBLIC_APP_SUPABASE_URL ?? "").replace(/\/+$/, "")
  return `${base}/storage/v1/object/public/menu-images/vendors/${vendorId}/`
}

/**
 * Vendors get their own store. Admins may preview any store read-only by
 * passing its id; every vendor write action still requires the vendor role.
 */
export async function getVendorWorkspace(previewVendorId?: string): Promise<ActionResult<VendorWorkspace>> {
  const caller = await requireRole(["vendor", "admin"])
  if ("error" in caller) return { data: EMPTY_VENDOR, error: caller.error }
  const vendorId = caller.role === "admin" ? previewVendorId ?? null : caller.vendorId
  if (!vendorId) {
    return { data: EMPTY_VENDOR, error: caller.role === "admin" ? null : "Your account isn't linked to a store yet. Contact DOORS support." }
  }
  try {
    const { supabase } = caller
    const [vendor, orders, menu] = await Promise.all([
      supabase.from("vendors").select("id, name, category, is_active, rating, delivery_minutes, created_at").eq("id", vendorId).maybeSingle(),
      supabase
        .from("orders")
        .select("id, order_code, created_at, customer_name, phone, dropoff_location, item_description, status, subtotal, total, payment_method, payment_status, rider_id, delivered_at, order_items(item_name, unit_price, quantity)")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(500),
      loadMenu(supabase, vendorId),
    ])
    const firstError = vendor.error ?? orders.error ?? menu.error
    if (firstError) return fail(EMPTY_VENDOR, firstError, "vendor workspace query failed")
    return {
      data: { vendor: (vendor.data as VendorRow | null) ?? null, orders: (orders.data ?? []) as VendorOrder[], menu: (menu.data ?? []) as VendorMenuItem[] },
      error: null,
    }
  } catch (error) {
    return fail(EMPTY_VENDOR, error, "vendor workspace crashed")
  }
}

/** Vendors can accept (pending → confirmed) or reject (pending → cancelled) new orders only. */
export async function vendorRespondToOrder(orderId: string, decision: "accept" | "reject"): Promise<ActionResult> {
  const caller = await requireRole(["vendor"])
  if ("error" in caller) return { data: null, error: caller.error }
  if (!caller.vendorId) return { data: null, error: "Your account isn't linked to a store yet." }
  try {
    const status = decision === "accept" ? "confirmed" : "cancelled"
    const { data, error } = await caller.supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .eq("vendor_id", caller.vendorId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle()
    if (error) return fail(null, error, "vendor respond failed")
    return data ? { data: null, error: null } : { data: null, error: "This order was already handled. Refreshing…" }
  } catch (error) {
    return fail(null, error, "vendor respond crashed")
  }
}

export type MenuItemInput = {
  name: string
  description: string | null
  price: number
  category: string | null
  image_url: string | null
  video_url: string | null
  stock_quantity: number | null
  is_available: boolean
}

/**
 * Photos and videos must be files the vendor uploaded into their own folder
 * (no pasted links). An item may keep the media it already had.
 */
function checkMedia(value: string | null | undefined, kind: "Photo" | "Video", vendorId: string, current: string | null): { url: string | null } | { error: string } {
  const url = String(value ?? "").trim() || null
  if (!url || url === current) return { url }
  const prefix = vendorMediaPrefix(vendorId)
  const rest = url.slice(prefix.length)
  if (!url.startsWith(prefix) || rest.length === 0 || rest.length > 120 || !/^[\w.-]+$/.test(rest) || rest.includes("..")) {
    return { error: `${kind} must be uploaded from your device.` }
  }
  return { url }
}

function cleanMenuInput(input: MenuItemInput, vendorId: string, current: { image_url: string | null; video_url: string | null }): MenuItemInput | { error: string } {
  const name = String(input.name ?? "").trim()
  if (name.length < 2 || name.length > 80) return { error: "Name must be 2–80 characters." }
  const price = Number(input.price)
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) return { error: "Enter a valid price." }
  const description = String(input.description ?? "").trim().slice(0, 300) || null
  const category = String(input.category ?? "").trim().slice(0, 40) || null
  const image = checkMedia(input.image_url, "Photo", vendorId, current.image_url)
  if ("error" in image) return image
  const video = checkMedia(input.video_url, "Video", vendorId, current.video_url)
  if ("error" in video) return video
  const image_url = image.url
  const video_url = video.url
  let stock_quantity: number | null = null
  if (input.stock_quantity !== null && input.stock_quantity !== undefined && String(input.stock_quantity) !== "") {
    stock_quantity = Number(input.stock_quantity)
    if (!Number.isInteger(stock_quantity) || stock_quantity < 0) return { error: "Stock must be a whole number, 0 or more." }
  }
  return { name, description, price: Math.round(price * 100) / 100, category, image_url, video_url, stock_quantity, is_available: Boolean(input.is_available) }
}

/** Vendors create or edit items on their own menu. RLS also limits this to their store. */
export async function vendorSaveMenuItem(itemId: string | null, input: MenuItemInput): Promise<ActionResult> {
  const caller = await requireRole(["vendor"])
  if ("error" in caller) return { data: null, error: caller.error }
  if (!caller.vendorId) return { data: null, error: "Your account isn't linked to a store yet." }
  const vendorId = caller.vendorId
  try {
    let current: { image_url: string | null; video_url: string | null } = { image_url: null, video_url: null }
    if (itemId) {
      const existing = await loadMenu(caller.supabase, vendorId)
      if (existing.error) return fail(null, existing.error, "vendor load menu item failed")
      const row = (existing.data ?? []).find((m) => m.id === itemId)
      if (!row) return { data: null, error: "That item wasn't found on your menu." }
      current = { image_url: row.image_url ?? null, video_url: row.video_url ?? null }
    }
    const clean = cleanMenuInput(input, vendorId, current)
    if ("error" in clean) return { data: null, error: clean.error }
    const write = (values: Partial<MenuItemInput>) => (itemId
      ? caller.supabase.from("menu_items").update(values).eq("id", itemId).eq("vendor_id", vendorId)
      : caller.supabase.from("menu_items").insert({ ...values, vendor_id: vendorId })
    ).select("id").maybeSingle()
    let { data, error } = await write(clean)
    if (isMissingColumn(error)) {
      if (clean.video_url) return { data: null, error: "Product videos aren't switched on yet. Save with a photo for now." }
      const { video_url: _skip, ...withoutVideo } = clean
      ;({ data, error } = await write(withoutVideo))
    }
    if (error) return fail(null, error, "vendor save menu item failed")
    return data ? { data: null, error: null } : { data: null, error: "That item wasn't found on your menu." }
  } catch (error) {
    return fail(null, error, "vendor save menu item crashed")
  }
}

/** Quick sold-out / available toggle. */
export async function vendorSetItemAvailability(itemId: string, isAvailable: boolean): Promise<ActionResult> {
  const caller = await requireRole(["vendor"])
  if ("error" in caller) return { data: null, error: caller.error }
  if (!caller.vendorId) return { data: null, error: "Your account isn't linked to a store yet." }
  try {
    const { data, error } = await caller.supabase
      .from("menu_items")
      .update({ is_available: isAvailable })
      .eq("id", itemId)
      .eq("vendor_id", caller.vendorId)
      .select("id")
      .maybeSingle()
    if (error) return fail(null, error, "vendor availability failed")
    return data ? { data: null, error: null } : { data: null, error: "That item wasn't found on your menu." }
  } catch (error) {
    return fail(null, error, "vendor availability crashed")
  }
}

/* ----------------------------------------------------------------------------
 * Rider
 * ------------------------------------------------------------------------- */

export type RiderOrder = {
  id: string
  order_code: string
  created_at: string
  customer_name: string
  phone: string
  pickup_location: string | null
  dropoff_location: string
  dropoff_lat: number | null
  dropoff_lng: number | null
  dropoff_note: string | null
  status: OrderStatus
  total: number | null
  delivery_fee: number | null
  payment_method: string | null
  payment_status: string | null
  rider_id: string | null
  rider_earning: number | null
  delivered_at: string | null
  order_items: { item_name: string; unit_price: number; quantity: number }[]
  vendors: { name: string } | null
}

export type RiderWorkspace = {
  riderId: string | null
  riderName: string | null
  orders: RiderOrder[]
  earnings: { day: string; deliveries: number; earnings: number }[]
}

const EMPTY_RIDER: RiderWorkspace = { riderId: null, riderName: null, orders: [], earnings: [] }

/**
 * Riders get their own deliveries. Admins may preview a chosen rider read-only;
 * rider write actions (accept, pickup, deliver, location) still require the rider role.
 */
export async function getRiderWorkspace(previewRiderId?: string): Promise<ActionResult<RiderWorkspace>> {
  const caller = await requireRole(["rider", "admin"])
  if ("error" in caller) return { data: EMPTY_RIDER, error: caller.error }
  try {
    const { supabase } = caller
    let userId = caller.userId
    if (caller.role === "admin") {
      if (!previewRiderId) return { data: EMPTY_RIDER, error: null }
      const { data: target, error: targetError } = await supabase.from("profiles").select("role").eq("id", previewRiderId).maybeSingle()
      if (targetError) return fail(EMPTY_RIDER, targetError, "rider preview lookup failed")
      if (target?.role !== "rider") return { data: EMPTY_RIDER, error: "That person isn't a rider." }
      userId = previewRiderId
    }
    const [profile, declines, orders, earnings] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
      supabase.from("order_declines").select("order_id").eq("rider_id", userId),
      supabase
        .from("orders")
        .select("id, order_code, created_at, customer_name, phone, pickup_location, dropoff_location, dropoff_lat, dropoff_lng, dropoff_note, status, total, delivery_fee, payment_method, payment_status, rider_id, rider_earning, delivered_at, order_items(item_name, unit_price, quantity), vendors(name)")
        .or(`rider_id.eq.${userId},and(status.eq.confirmed,rider_id.is.null)`)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("rider_daily_earnings").select("day, deliveries, earnings").eq("rider_id", userId).order("day", { ascending: false }).limit(60),
    ])
    const firstError = declines.error ?? orders.error ?? earnings.error
    if (firstError) return fail(EMPTY_RIDER, firstError, "rider workspace query failed")
    const declined = new Set((declines.data ?? []).map((row) => row.order_id))
    const visible = (orders.data ?? [])
      .filter((order) => order.rider_id === userId || !declined.has(order.id))
      .map((row) => ({ ...row, vendors: Array.isArray(row.vendors) ? row.vendors[0] ?? null : row.vendors })) as RiderOrder[]
    const name = profile.data?.full_name?.trim() || profile.data?.email?.split("@")[0] || null
    return {
      data: {
        riderId: userId,
        riderName: name,
        orders: visible,
        earnings: (earnings.data ?? []).map((row) => ({ day: String(row.day), deliveries: Number(row.deliveries) || 0, earnings: Number(row.earnings) || 0 })),
      },
      error: null,
    }
  } catch (error) {
    return fail(EMPTY_RIDER, error, "rider workspace crashed")
  }
}

/**
 * Admin confirms that a manual bank transfer for an order has arrived in the DOORS account.
 * Only unpaid transfer orders can be confirmed; the amount recorded is the order total.
 * (orders_guard lets admins change payment fields; RLS "admin updates orders" allows the write.)
 */
export async function adminConfirmTransferPayment(orderId: string): Promise<ActionResult> {
  const caller = await requireRole(["admin"])
  if ("error" in caller) return { data: null, error: caller.error }
  try {
    const { supabase } = caller
    const { data: order, error: readError } = await supabase
      .from("orders")
      .select("id, total, payment_method, payment_status")
      .eq("id", orderId)
      .maybeSingle()
    if (readError) return fail(null, readError, "confirm payment lookup failed")
    if (!order) return { data: null, error: "Order not found." }
    if (order.payment_method !== "transfer") return { data: null, error: "Only bank transfer orders can be confirmed here." }
    if (order.payment_status === "paid") return { data: null, error: "This payment is already confirmed." }
    const { data, error } = await supabase
      .from("orders")
      .update({ payment_status: "paid", paid_at: new Date().toISOString(), amount_paid: order.total })
      .eq("id", orderId)
      .eq("payment_method", "transfer")
      .eq("payment_status", order.payment_status)
      .select("id")
      .maybeSingle()
    if (error) return fail(null, error, "confirm payment failed")
    return data ? { data: null, error: null } : { data: null, error: "This order changed. Refreshing…" }
  } catch (error) {
    return fail(null, error, "confirm payment crashed")
  }
}

/**
 * Admin: ask Squad again about an unpaid online order (e.g. if a webhook was missed).
 * Goes through the same verified path as the webhook; it never marks paid without Squad's confirmation.
 */
export async function adminRecheckOnlinePayment(orderId: string): Promise<ActionResult<string>> {
  const caller = await requireRole(["admin"])
  if ("error" in caller) return { data: "", error: caller.error }
  try {
    const { data: order, error } = await caller.supabase
      .from("orders")
      .select("id, order_code, payment_method, payment_reference")
      .eq("id", orderId)
      .maybeSingle()
    if (error) return fail("", error, "recheck payment lookup failed")
    if (!order) return { data: "", error: "Order not found." }
    if (order.payment_method !== "card") return { data: "", error: "Only online (Squad) orders can be checked with Squad." }
    if (!order.payment_reference) return { data: "", error: "The customer never opened the payment page for this order." }
    const outcome = await confirmSquadPayment(order.payment_reference)
    switch (outcome.state) {
      case "paid": return { data: outcome.alreadyPaid ? "Already paid." : "Payment confirmed by Squad.", error: null }
      case "pending": return { data: "Squad says the payment is still pending.", error: null }
      case "not_paid": return { data: `Not paid (Squad: ${outcome.squadStatus}).`, error: null }
      case "needs_review": return { data: "", error: `Squad reports a payment that doesn't match this order (${outcome.detail}). Check it in the Squad dashboard.` }
      case "unknown_reference": return { data: "", error: "This payment reference wasn't found." }
      default: return { data: "", error: "Couldn't reach Squad right now. Try again shortly." }
    }
  } catch (error) {
    return fail("", error, "recheck payment crashed")
  }
}
