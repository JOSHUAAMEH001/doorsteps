"use server"

import { updateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { STORE_CATEGORIES } from "@/lib/store-categories"

/**
 * Admin "Store editor": edit vendors (name, category, banner, visibility, delivery time)
 * and their products. Every action re-checks the admin role here; Supabase RLS enforces
 * the same rule (admin policies on vendors and menu_items, migration
 * 20261122_admin_vendors_and_prepaid_gate.sql). Photos must be files uploaded to DOORS'
 * own storage (no pasted links).
 */

export type EditorVendor = {
  id: string
  name: string
  category: string
  image_url: string | null
  rating: number | null
  delivery_minutes: number | null
  is_active: boolean
  created_at: string
}

export type EditorProduct = {
  id: string
  vendor_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  video_url: string | null
  is_available: boolean
  category: string | null
  stock_quantity: number | null
}

export type EditorResult<T = null> = { data: T; error: string | null }

const GENERIC = "Something went wrong. Please try again."

async function adminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  return data?.role === "admin" ? supabase : null
}

function storagePrefix() {
  const base = (process.env.APP_SUPABASE_URL ?? process.env.NEXT_PUBLIC_APP_SUPABASE_URL ?? "").replace(/\/+$/, "")
  return `${base}/storage/v1/object/public/menu-images/`
}

/** A photo/video must be one uploaded to DOORS storage, or the value it already had. */
function checkMedia(value: unknown, current: string | null, label: string): { url: string | null } | { error: string } {
  const url = typeof value === "string" ? value.trim() || null : null
  if (!url || url === current) return { url }
  const prefix = storagePrefix()
  const rest = url.slice(prefix.length)
  if (!url.startsWith(prefix) || !rest || rest.length > 200 || !/^[\w./-]+$/.test(rest) || rest.includes("..")) {
    return { error: `${label} must be uploaded from your device.` }
  }
  return { url }
}

function refreshCustomerApp() {
  // Customers see the change on their next load instead of after the 60-second cache.
  try { updateTag("catalog-vendors") } catch { /* outside a server action (tests) */ }
}

export async function getEditorVendors(): Promise<EditorResult<EditorVendor[]>> {
  const supabase = await adminClient()
  if (!supabase) return { data: [], error: "You don't have permission to view this." }
  const { data, error } = await supabase
    .from("vendors")
    .select("id, name, category, image_url, rating, delivery_minutes, is_active, created_at")
    .order("is_active", { ascending: false })
    .order("name")
  if (error) {
    console.error("[store-editor] vendors failed", error)
    return { data: [], error: "Couldn't load vendors. Please try again." }
  }
  return { data: (data ?? []) as EditorVendor[], error: null }
}

export async function getEditorProducts(vendorId: string): Promise<EditorResult<EditorProduct[]>> {
  const supabase = await adminClient()
  if (!supabase) return { data: [], error: "You don't have permission to view this." }
  if (!/^[0-9a-f-]{36}$/i.test(vendorId)) return { data: [], error: "Unknown vendor." }
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, vendor_id, name, description, price, image_url, video_url, is_available, category, stock_quantity")
    .eq("vendor_id", vendorId)
    .order("name")
  if (error) {
    console.error("[store-editor] products failed", error)
    return { data: [], error: "Couldn't load products. Please try again." }
  }
  return { data: (data ?? []) as EditorProduct[], error: null }
}

export type VendorInput = { name: string; category: string; image_url: string | null; delivery_minutes: number | null; is_active: boolean }

function cleanVendor(input: VendorInput, currentImage: string | null): VendorInput | { error: string } {
  const name = String(input?.name ?? "").replace(/\s+/g, " ").trim()
  if (name.length < 2 || name.length > 80) return { error: "Store name must be 2–80 characters." }
  const category = String(input?.category ?? "")
  if (!(STORE_CATEGORIES as readonly string[]).includes(category)) return { error: "Choose Food or Groceries." }
  let delivery_minutes: number | null = null
  if (input?.delivery_minutes !== null && input?.delivery_minutes !== undefined && String(input.delivery_minutes) !== "") {
    delivery_minutes = Number(input.delivery_minutes)
    if (!Number.isInteger(delivery_minutes) || delivery_minutes < 5 || delivery_minutes > 180) return { error: "Delivery time must be 5–180 minutes." }
  }
  const image = checkMedia(input?.image_url, currentImage, "The banner photo")
  if ("error" in image) return image
  return { name, category, image_url: image.url, delivery_minutes, is_active: Boolean(input?.is_active) }
}

export async function adminSaveVendor(vendorId: string | null, input: VendorInput): Promise<EditorResult<{ id: string } | null>> {
  const supabase = await adminClient()
  if (!supabase) return { data: null, error: "You don't have permission to do that." }
  try {
    let currentImage: string | null = null
    if (vendorId) {
      if (!/^[0-9a-f-]{36}$/i.test(vendorId)) return { data: null, error: "Unknown vendor." }
      const { data: current, error } = await supabase.from("vendors").select("image_url").eq("id", vendorId).maybeSingle()
      if (error) { console.error("[store-editor] vendor lookup failed", error); return { data: null, error: GENERIC } }
      if (!current) return { data: null, error: "That vendor no longer exists." }
      currentImage = current.image_url
    }
    const clean = cleanVendor(input, currentImage)
    if ("error" in clean) return { data: null, error: clean.error }
    const query = vendorId
      ? supabase.from("vendors").update(clean).eq("id", vendorId)
      : supabase.from("vendors").insert(clean)
    const { data, error } = await query.select("id").maybeSingle()
    if (error) { console.error("[store-editor] save vendor failed", error); return { data: null, error: GENERIC } }
    if (!data) return { data: null, error: "Couldn't save. Please refresh and try again." }
    refreshCustomerApp()
    return { data: { id: data.id as string }, error: null }
  } catch (error) {
    console.error("[store-editor] save vendor crashed", error)
    return { data: null, error: GENERIC }
  }
}

export type ProductInput = {
  name: string
  description: string | null
  price: number
  category: string | null
  image_url: string | null
  video_url: string | null
  is_available: boolean
}

function cleanProduct(input: ProductInput, current: { image_url: string | null; video_url: string | null }): ProductInput | { error: string } {
  const name = String(input?.name ?? "").replace(/\s+/g, " ").trim()
  if (name.length < 2 || name.length > 80) return { error: "Product name must be 2–80 characters." }
  const price = Number(input?.price)
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) return { error: "Enter a valid price in naira." }
  const description = String(input?.description ?? "").trim().slice(0, 300) || null
  const category = String(input?.category ?? "").trim().slice(0, 40) || null
  const image = checkMedia(input?.image_url, current.image_url, "The product photo")
  if ("error" in image) return image
  const video = checkMedia(input?.video_url, current.video_url, "The product video")
  if ("error" in video) return video
  return { name, description, price: Math.round(price * 100) / 100, category, image_url: image.url, video_url: video.url, is_available: Boolean(input?.is_available) }
}

export async function adminSaveProduct(vendorId: string, productId: string | null, input: ProductInput): Promise<EditorResult> {
  const supabase = await adminClient()
  if (!supabase) return { data: null, error: "You don't have permission to do that." }
  if (!/^[0-9a-f-]{36}$/i.test(vendorId) || (productId && !/^[0-9a-f-]{36}$/i.test(productId))) return { data: null, error: "Unknown product." }
  try {
    let current = { image_url: null as string | null, video_url: null as string | null }
    if (productId) {
      const { data, error } = await supabase.from("menu_items").select("image_url, video_url, vendor_id").eq("id", productId).maybeSingle()
      if (error) { console.error("[store-editor] product lookup failed", error); return { data: null, error: GENERIC } }
      if (!data || data.vendor_id !== vendorId) return { data: null, error: "That product no longer exists." }
      current = { image_url: data.image_url, video_url: data.video_url }
    }
    const clean = cleanProduct(input, current)
    if ("error" in clean) return { data: null, error: clean.error }
    const query = productId
      ? supabase.from("menu_items").update(clean).eq("id", productId).eq("vendor_id", vendorId)
      : supabase.from("menu_items").insert({ ...clean, vendor_id: vendorId })
    const { data, error } = await query.select("id").maybeSingle()
    if (error) { console.error("[store-editor] save product failed", error); return { data: null, error: GENERIC } }
    if (!data) return { data: null, error: "Couldn't save. Please refresh and try again." }
    refreshCustomerApp()
    return { data: null, error: null }
  } catch (error) {
    console.error("[store-editor] save product crashed", error)
    return { data: null, error: GENERIC }
  }
}
