"use client"

import { FormEvent, useEffect, useState } from "react"
import { Logo } from "@/components/brand/logo"
import { PrimaryButton } from "@/components/app/ui"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const supabase = createClient()
    let active = true
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (active) setReady(Boolean(data.session))
      } catch (error) {
        console.error("[v0] recovery session check failed", error)
        if (active) setReady(false)
      }
    }
    void checkSession()
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === "PASSWORD_RECOVERY" || session) setReady(true)
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 8) { setMessage("Password must be at least 8 characters."); return }
    if (password !== confirm) { setMessage("Passwords do not match."); return }
    setLoading(true)
    setMessage("")
    try {
      const { error } = await createClient().auth.updateUser({ password })
      if (error) { setMessage("We couldn't update your password. Request a new reset link."); return }
      setUpdated(true)
      window.setTimeout(() => { window.location.href = "/" }, 2000)
    } catch (error) {
      console.error("[v0] password update failed", error)
      setMessage("We couldn't update your password. Request a new reset link.")
    } finally { setLoading(false) }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm">
        <Logo size="md" showTagline />
        <h1 className="mt-10 text-2xl font-extrabold tracking-tight">Reset password</h1>
        {!ready ? <><p className="mt-3 text-sm text-muted-foreground">This link has expired. Request a new one.</p><a href="/forgot-password" className="mt-6 block text-center text-sm font-semibold text-brand">Request a new reset link</a></> : updated ? <p className="mt-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand">Password updated. Redirecting to login...</p> : <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block text-xs font-semibold text-muted-foreground">New password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand" /></label>
          <label className="block text-xs font-semibold text-muted-foreground">Confirm new password<input required minLength={8} type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand" /></label>
          {message ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive">{message}</p> : null}
          <PrimaryButton type="submit" disabled={loading}>{loading ? "Updating..." : "Update password"}</PrimaryButton>
        </form>}
      </div>
    </main>
  )
}
