"use client"

import { createClient } from "@/lib/supabase/client"

/** Public bucket for profile pictures. Each user may only write inside avatars/<their user id>/. */
const BUCKET = "avatars"
const SIZE = 512
const MAX_INPUT_MB = 15

/** Crops a photo to a centred square and shrinks it to 512×512 JPEG. Null if the browser can't read it. */
async function squarePhoto(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement("canvas")
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
    bitmap.close()
    return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85))
  } catch {
    return null
  }
}

/** Uploads a new profile picture for this user and returns its public URL, or a friendly error. */
export async function uploadAvatar(file: File, userId: string): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith("image/")) return { error: "That isn't a photo. Choose a JPG or PNG image." }
  if (file.size > MAX_INPUT_MB * 1024 * 1024) return { error: `That photo is too large (max ${MAX_INPUT_MB} MB).` }
  const body = await squarePhoto(file)
  if (!body) return { error: "We couldn't read that photo. Try a JPG or PNG." }

  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  })
  if (error) {
    console.error("[avatar] upload failed", error)
    if (/bucket not found|row-level security|unauthorized|not allowed|403|404/i.test(error.message)) {
      return { error: "Profile pictures aren't switched on yet. Please try again later." }
    }
    return { error: "Upload failed. Check your connection and try again." }
  }
  return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl }
}

/** Best-effort clean-up of an old picture after a new one is saved. Never throws. */
export async function removeAvatar(url: string | null | undefined, userId: string) {
  if (!url) return
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const index = url.indexOf(marker)
  if (index === -1) return
  const path = url.slice(index + marker.length)
  if (!path.startsWith(`${userId}/`)) return
  try {
    await createClient().storage.from(BUCKET).remove([path])
  } catch {
    // An unused old picture is harmless.
  }
}
