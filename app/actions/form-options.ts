"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Choice lists used by the /join forms. Stored in public.form_options so the
 * DOORS team can edit them from the admin dashboard without a code change.
 * Visitors always also get an "Other" option to type their own answer.
 */

export type FormOptionKey = "waitlist_areas" | "vendor_categories"
export type FormOptions = Record<FormOptionKey, string[]>

// Used only if the database can't be reached, so the forms never break.
const FALLBACK: FormOptions = {
  waitlist_areas: ["ESUT campus (hostel)", "ESUT staff quarters", "Agbani town", "Amechi Uwani / nearby"],
  vendor_categories: ["Restaurant", "Food vendor / Buka", "Supermarket", "Grocery store", "Bakery & snacks", "Drinks & smoothies"],
}

function clean(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  return list
    .map((v) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 60) : ""))
    .filter((v) => v && v.toLowerCase() !== "other" && !seen.has(v.toLowerCase()) && seen.add(v.toLowerCase()))
    .slice(0, 40)
}

export async function getFormOptions(): Promise<FormOptions> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("form_options").select("key, options")
    if (error || !data) return FALLBACK
    const out: FormOptions = { ...FALLBACK }
    for (const row of data) {
      const list = clean(row.options)
      if (list.length && (row.key === "waitlist_areas" || row.key === "vendor_categories")) out[row.key as FormOptionKey] = list
    }
    return out
  } catch {
    return FALLBACK
  }
}

/** Admin only. Saves a list (one item per entry). "Other" is added automatically in the forms. */
export async function updateFormOptions(key: FormOptionKey, list: string[]): Promise<{ error: string | null; saved?: string[] }> {
  if (key !== "waitlist_areas" && key !== "vendor_categories") return { error: "Unknown list." }
  const items = clean(list)
  if (!items.length) return { error: "Add at least one choice." }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Please log in again." }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "admin") return { error: "You don't have permission to do that." }
  const { data, error } = await supabase
    .from("form_options")
    .update({ options: items, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq("key", key)
    .select("key")
    .maybeSingle()
  if (error) {
    console.error("[form-options] update failed", error)
    return { error: "Couldn't save. Please try again." }
  }
  return data ? { error: null, saved: items } : { error: "That list wasn't found." }
}
