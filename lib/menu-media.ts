"use client"

import { createClient } from "@/lib/supabase/client"

/** Storage bucket for menu photos/videos. Vendors may only write to vendors/<their vendor id>/. */
const BUCKET = "menu-images"

export const MAX_VIDEO_MB = 50
export const MAX_VIDEO_SECONDS = 90
const MAX_PHOTO_MB = 15 // before compression
const PHOTO_MAX_EDGE = 1600

const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" }
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic", "image/heif": "heif" }

export type MediaKind = "photo" | "video"

/** Shrinks a phone photo to at most 1600px on its longest side, saved as JPEG. Returns null if the browser can't read it. */
export async function compressPhoto(file: File): Promise<Blob | null> {
  if (file.type === "image/gif") return null // keep animation
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.fillStyle = "#fff" // transparent PNGs get a white background instead of black
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85))
  } catch {
    return null
  }
}

function videoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"
    const done = (value: number | null) => { URL.revokeObjectURL(url); resolve(value) }
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : null)
    video.onerror = () => done(null)
    setTimeout(() => done(null), 8000)
    video.src = url
  })
}

/** Checks, compresses (photos) and uploads a file. Returns its public URL or a friendly error. */
export async function uploadMenuMedia(file: File, kind: MediaKind, vendorId: string): Promise<{ url: string } | { error: string }> {
  let body: Blob = file
  let ext: string

  if (kind === "photo") {
    if (!file.type.startsWith("image/")) return { error: "That isn't a photo. Choose a JPG or PNG image." }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) return { error: `That photo is too large (max ${MAX_PHOTO_MB} MB).` }
    const compressed = await compressPhoto(file)
    if (compressed) {
      body = compressed
      ext = "jpg"
    } else {
      const known = PHOTO_TYPES[file.type]
      if (!known) return { error: "We couldn't read that photo. Try a JPG or PNG." }
      if (file.size > 5 * 1024 * 1024) return { error: "We couldn't shrink that photo. Try a smaller JPG or PNG." }
      ext = known
    }
  } else {
    const known = VIDEO_TYPES[file.type]
    if (!known) return { error: "Use an MP4, MOV or WebM video." }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) return { error: `That video is too large (max ${MAX_VIDEO_MB} MB). Try a shorter clip.` }
    const seconds = await videoDuration(file)
    if (seconds !== null && seconds > MAX_VIDEO_SECONDS + 1) return { error: `Keep videos under ${MAX_VIDEO_SECONDS} seconds.` }
    ext = known
  }

  const path = `vendors/${vendorId}/${crypto.randomUUID()}.${ext}`
  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: ext === "jpg" ? "image/jpeg" : file.type,
    cacheControl: "31536000",
    upsert: false,
  })
  if (error) {
    console.error("[menu-media] upload failed", error)
    if (/row-level security|unauthorized|not allowed|403/i.test(error.message)) {
      return { error: "Uploads aren't switched on for your store yet. Contact DOORS support." }
    }
    if (/size|too large|413/i.test(error.message)) return { error: "That file is too large." }
    return { error: "Upload failed. Check your connection and try again." }
  }
  return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl }
}
