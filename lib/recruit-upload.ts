"use client"

import { createClient } from "@/lib/supabase/client"
import { compressPhoto } from "@/lib/menu-media"

/**
 * Uploads application files into the PRIVATE "applications" bucket at
 * <kind>/<application id>/<label>-<random>.<ext>. The database only accepts
 * uploads for an application submitted in the last hour (max 12 files), and
 * only admins can read them back. No public URLs are ever created.
 */

export const MAX_FILE_MB = 10
const DOC_TYPES: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" }

export type PendingFile = { label: string; file: File }

/** Checks a picked file before it's accepted into the form. Returns an error message or null. */
export function checkFile(file: File, allowPdf: boolean): string | null {
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `That file is too large (max ${MAX_FILE_MB} MB).`
  if (file.type === "application/pdf") return allowPdf ? null : "Please choose a photo (JPG or PNG)."
  if (!file.type.startsWith("image/")) return allowPdf ? "Choose a photo or a PDF." : "Please choose a photo (JPG or PNG)."
  return null
}

async function uploadOne(kind: "vendor" | "rider", id: string, item: PendingFile): Promise<boolean> {
  const label = item.label.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40) || "file"
  let body: Blob = item.file
  let ext = DOC_TYPES[item.file.type]
  if (item.file.type.startsWith("image/")) {
    const small = await compressPhoto(item.file)
    if (small) {
      body = small
      ext = "jpg"
    }
  }
  if (!ext) return false
  const path = `${kind}/${id}/${label}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await createClient().storage.from("applications").upload(path, body, {
    contentType: ext === "jpg" ? "image/jpeg" : ext === "pdf" ? "application/pdf" : item.file.type,
    upsert: false,
  })
  if (error) console.error("[recruit-upload] failed", label, error.message)
  return !error
}

/** Uploads files two at a time. Returns how many failed. */
export async function uploadApplicationFiles(kind: "vendor" | "rider", id: string, files: PendingFile[], onProgress?: (done: number, total: number) => void) {
  let done = 0
  let failed = 0
  const queue = [...files]
  async function worker() {
    while (queue.length) {
      const item = queue.shift()!
      const ok = await uploadOne(kind, id, item).catch(() => false)
      if (!ok) failed++
      done++
      onProgress?.(done, files.length)
    }
  }
  await Promise.all([worker(), worker()])
  return failed
}
