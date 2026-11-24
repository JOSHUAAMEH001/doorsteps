"use server"

import { createClient } from "@/lib/supabase/server"

export type ProfileInput = { fullName: string; phone: string; avatarUrl: string | null }
export type ProfileSaveResult = { ok: true } | { ok: false; error: string }

/** Nigerian mobile number in any common format: 0701..., 234701..., +234 701... */
function normalisePhone(value: string): string | null {
  const digits = value.replace(/\D/g, "")
  if (/^0[789][01]\d{8}$/.test(digits)) return "234" + digits.slice(1)
  if (/^234[789][01]\d{8}$/.test(digits)) return digits
  if (/^[789][01]\d{8}$/.test(digits)) return "234" + digits
  return null
}

/**
 * Saves the signed-in customer's own name, phone and profile picture.
 * The database enforces the same rules (profiles_self_edit_guard): a user can only change
 * these three fields on their own row, never their role.
 */
export async function updateMyProfile(input: ProfileInput): Promise<ProfileSaveResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Please log in again." }

    const fullName = String(input.fullName ?? "").replace(/\s+/g, " ").trim()
    if (fullName.length < 2) return { ok: false, error: "Enter your name." }
    if (fullName.length > 80) return { ok: false, error: "That name is too long." }

    const rawPhone = String(input.phone ?? "").trim()
    const phone = rawPhone ? normalisePhone(rawPhone) : null
    if (rawPhone && !phone) return { ok: false, error: "Enter a valid Nigerian phone number, like 0701 234 5678." }

    const avatarUrl = input.avatarUrl ? String(input.avatarUrl) : null
    const ownFolder = `${process.env.APP_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`
    if (avatarUrl && !avatarUrl.startsWith(ownFolder)) return { ok: false, error: "Upload your profile picture from the DOORS app." }

    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, avatar_url: avatarUrl })
      .eq("id", user.id)
      .select("id")
      .maybeSingle()

    if (error) {
      console.error("[profile] save failed", error)
      if (error.code === "42703") return { ok: false, error: "Profile editing isn't switched on yet. Please try again later." }
      // Friendly messages raised by the database guard.
      if (/valid Nigerian phone|only change your name|profile picture from the DOORS app/i.test(error.message)) {
        return { ok: false, error: error.message }
      }
      return { ok: false, error: "We couldn't save your profile. Please try again." }
    }
    // No row back means the database didn't allow the update (editing not switched on yet).
    if (!data) return { ok: false, error: "Profile editing isn't switched on yet. Please try again later." }
    return { ok: true }
  } catch (error) {
    console.error("[profile] save crashed", error)
    return { ok: false, error: "We couldn't save your profile. Please try again." }
  }
}
