"use client"

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import useSWR, { mutate } from "swr"
import { Bell, Camera, ChevronRight, Headphones, LoaderCircle, LogIn, LogOut, Package, Pencil, Settings, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useApp } from "@/lib/store"
import type { Screen } from "@/lib/store"
import { ScreenHeader } from "@/components/app/ui"
import { useSignOut } from "@/components/dashboard/shell"
import { getCurrentProfile, type CurrentProfile } from "@/app/actions/roles"
import { updateMyProfile } from "@/app/actions/profile"
import { removeAvatar, uploadAvatar } from "@/lib/avatar-upload"

interface Row {
  icon: LucideIcon
  label: string
  value?: string
  to: Screen
}

/** 2347018038264 -> 0701 803 8264 */
function formatPhone(phone: string | null | undefined) {
  if (!phone) return ""
  const local = phone.startsWith("234") ? "0" + phone.slice(3) : phone
  return local.length === 11 ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : local
}

function Avatar({ name, url, size = 64 }: { name: string; url?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [url])
  const style = { width: size, height: size }
  if (url && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={style} onError={() => setBroken(true)} className="shrink-0 rounded-full object-cover" />
  }
  return (
    <span style={style} className="flex shrink-0 items-center justify-center rounded-full bg-brand text-2xl font-extrabold text-brand-foreground">
      {(name.trim().charAt(0) || "D").toUpperCase()}
    </span>
  )
}

export function ProfileScreen() {
  const { navigate, isSignedIn, authChecked, orders } = useApp()
  const { signOut, busy: signingOut } = useSignOut()
  const { data: profileResult } = useSWR("current-profile", getCurrentProfile)
  const profile = profileResult?.data ?? null
  const [editing, setEditing] = useState(false)

  const name = profile?.full_name?.trim() || profile?.email?.split("@")[0] || "Customer"

  const rows: Row[] = [
    ...(isSignedIn ? [{ icon: Package, label: "My orders", value: orders.length ? String(orders.length) : undefined, to: "orders" as Screen }] : []),
    ...(isSignedIn ? [{ icon: Bell, label: "Notifications", to: "notifications" as Screen }] : []),
    { icon: Headphones, label: "Help & support", to: "support" },
    { icon: Settings, label: "Settings", to: "settings" },
  ]

  return (
    <div className="flex min-h-full flex-col bg-background pb-24">
      <ScreenHeader title="Profile" />

      <div className="px-5">
        {!authChecked ? (
          <div role="status" aria-label="Loading your profile" className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4">
            <span className="size-16 animate-pulse rounded-full bg-secondary" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
              <span className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
            </span>
          </div>
        ) : isSignedIn && profile ? (
          <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-sm">
            <Avatar name={name} url={profile.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-extrabold text-foreground">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
              {profile.phone ? (
                <p className="truncate text-xs text-muted-foreground tabular-nums">{formatPhone(profile.phone)}</p>
              ) : (
                <button type="button" onClick={() => setEditing(true)} className="text-xs font-bold text-brand">
                  Add your phone number
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit profile"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-transform active:scale-90"
            >
              <Pencil className="size-4" />
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <p className="text-lg font-extrabold text-foreground">You&apos;re not logged in</p>
            <p className="mt-1 text-sm text-muted-foreground">Log in or create an account to order and track deliveries.</p>
            <button
              type="button"
              onClick={() => navigate("auth")}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-bold text-brand-foreground active:scale-[0.98]"
            >
              <LogIn className="size-4" />
              Log in or sign up
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 px-5">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          {rows.map((r, i) => {
            const Icon = r.icon
            return (
              <button
                type="button"
                key={r.label}
                onClick={() => navigate(r.to)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary"
                style={{ borderTop: i === 0 ? undefined : "1px solid var(--border)" }}
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Icon className="size-4.5" />
                </span>
                <span className="flex-1 text-sm font-semibold text-foreground">{r.label}</span>
                {r.value ? <span className="text-xs font-medium text-muted-foreground">{r.value}</span> : null}
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            )
          })}
        </div>
      </div>

      {isSignedIn ? (
        <div className="px-5 pt-4">
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3.5 text-sm font-bold text-brand transition-colors active:bg-secondary disabled:opacity-60"
          >
            <LogOut className="size-4" />
            {signingOut ? "Signing out…" : "Log out"}
          </button>
        </div>
      ) : null}
      <p className="mt-4 text-center text-[11px] text-muted-foreground">Doorsteps Logistics • Version 1.0.0</p>

      {editing && profile ? <EditProfileSheet profile={profile} onClose={() => setEditing(false)} /> : null}
    </div>
  )
}

function EditProfileSheet({ profile, onClose }: { profile: CurrentProfile; onClose: () => void }) {
  const [fullName, setFullName] = useState(profile.full_name ?? "")
  const [phone, setPhone] = useState(formatPhone(profile.phone))
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInput.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose, saving])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0]
    event.target.value = ""
    if (!chosen) return
    setError("")
    setFile(chosen)
    setRemovePhoto(false)
    setPreview(URL.createObjectURL(chosen))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError("")
    try {
      let avatarUrl = removePhoto ? null : profile.avatar_url
      if (file) {
        const uploaded = await uploadAvatar(file, profile.id)
        if ("error" in uploaded) {
          setError(uploaded.error)
          return
        }
        avatarUrl = uploaded.url
      }
      const result = await updateMyProfile({ fullName, phone, avatarUrl })
      if (!result.ok) {
        setError(result.error)
        // A picture uploaded for a save that failed isn't used anywhere.
        if (file && avatarUrl) void removeAvatar(avatarUrl, profile.id)
        return
      }
      if (profile.avatar_url && profile.avatar_url !== avatarUrl) void removeAvatar(profile.avatar_url, profile.id)
      await mutate("current-profile")
      onClose()
    } catch {
      setError("We couldn't save your profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const shownPhoto = preview ?? (removePhoto ? null : profile.avatar_url)
  const inputClass = "mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3.5 text-sm font-medium outline-none transition focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close" onClick={() => !saving && onClose()} className="absolute inset-0 bg-black/45" />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        onSubmit={save}
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="edit-profile-title" className="text-lg font-extrabold text-foreground">Edit profile</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="flex size-9 items-center justify-center rounded-full bg-secondary disabled:opacity-50">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <Avatar name={fullName || profile.email} url={shownPhoto} size={72} />
          <div className="flex flex-col items-start gap-1.5">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={saving}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-soft px-3 text-sm font-bold text-brand disabled:opacity-50"
            >
              <Camera className="size-4" />
              {shownPhoto ? "Change photo" : "Add photo"}
            </button>
            {shownPhoto ? (
              <button
                type="button"
                onClick={() => { setFile(null); setPreview(null); setRemovePhoto(true) }}
                disabled={saving}
                className="px-1 text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
              >
                Remove photo
              </button>
            ) : null}
          </div>
          <input ref={fileInput} type="file" accept="image/*" onChange={choosePhoto} className="hidden" />
        </div>

        <label className="mt-5 block text-sm font-semibold text-foreground" htmlFor="profile-name">
          Your name
          <input
            ref={nameInput}
            id="profile-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            maxLength={80}
            required
            placeholder="e.g. Chika Eze"
            className={inputClass}
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor="profile-phone">
          Phone number <span className="font-normal text-muted-foreground">(for your rider)</span>
          <input
            id="profile-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            maxLength={20}
            placeholder="0701 234 5678"
            className={inputClass}
          />
        </label>

        <p className="mt-4 text-xs text-muted-foreground">Email: {profile.email}</p>

        {error ? (
          <p role="alert" className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-bold text-brand-foreground active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  )
}
