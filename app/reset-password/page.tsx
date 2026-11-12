"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { PrimaryButton } from "@/components/app/ui"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const [ready, setReady] = useState<"checking" | "ready" | "expired">("checking")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [message, setMessage] = useState("")
  const requestInFlight = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === "PASSWORD_RECOVERY" || session) setReady("ready")
    })

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (active) setReady(data.session ? "ready" : "expired")
      } catch {
        if (active) setReady("expired")
      }
    }

    void checkSession()
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (requestInFlight.current) return
    if (password.length < 8) { setMessage("Password must be at least 8 characters."); return }
    if (password !== confirm) { setMessage("Passwords do not match."); return }

    requestInFlight.current = true
    setLoading(true)
    setMessage("")
    try {
      const { error } = await createClient().auth.updateUser({ password })
      if (error) {
        setMessage("We couldn't update your password. Request a new reset link.")
        return
      }
      setUpdated(true)
      window.setTimeout(() => { window.location.href = "/?auth=login" }, 2000)
    } catch {
      setMessage("We couldn't update your password. Request a new reset link.")
    } finally {
      requestInFlight.current = false
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-secondary px-4 py-8 text-foreground sm:px-6">
      <section className="w-full max-w-md rounded-[2rem] border border-border/80 bg-card p-6 shadow-xl shadow-foreground/[0.04] sm:p-8">
        <Logo size="md" showTagline />
        <p className="mt-9 text-xs font-bold uppercase tracking-[0.16em] text-brand">Account recovery</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Choose a new password</h1>

        {ready === "checking" ? (
          <p role="status" className="mt-5 flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm font-medium text-muted-foreground">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Checking your secure reset link...
          </p>
        ) : ready === "expired" ? (
          <>
            <p role="alert" className="mt-3 rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm text-destructive">This reset link has expired or has already been used. Request a new one to continue.</p>
            <a href="/forgot-password" className="mt-6 block rounded-sm text-center text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Request a new reset link</a>
          </>
        ) : updated ? (
          <p role="status" aria-live="polite" className="mt-5 rounded-2xl border border-success/20 bg-success-soft px-4 py-3 text-sm font-semibold text-success">Password updated. Redirecting to login...</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5">
            <label className="block text-sm font-semibold text-foreground" htmlFor="new-password">
              New password
              <span className="relative mt-2 block">
                <input
                  id="new-password"
                  required
                  minLength={8}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3.5 pr-12 text-sm outline-none transition focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide new password" : "Show new password"} aria-pressed={showPassword} className="absolute inset-y-0 right-2 inline-flex size-10 items-center justify-center self-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
            </label>
            <label className="block text-sm font-semibold text-foreground" htmlFor="confirm-password">
              Confirm new password
              <span className="relative mt-2 block">
                <input
                  id="confirm-password"
                  required
                  minLength={8}
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3.5 pr-12 text-sm outline-none transition focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"
                />
                <button type="button" onClick={() => setShowConfirm((current) => !current)} aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"} aria-pressed={showConfirm} className="absolute inset-y-0 right-2 inline-flex size-10 items-center justify-center self-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                  {showConfirm ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
            </label>
            {message ? <p role="alert" aria-live="assertive" className="rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">{message}</p> : null}
            <PrimaryButton type="submit" disabled={loading} className="min-h-12 rounded-2xl">
              {loading ? <><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Updating password...</> : "Update password"}
            </PrimaryButton>
          </form>
        )}
      </section>
    </main>
  )
}
