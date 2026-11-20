"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { PrimaryButton } from "@/components/app/ui"
import { createRecoveryClient } from "@/lib/supabase/client"
import { clearPendingRecovery } from "@/lib/auth-recovery"

function getPasswordUpdateErrorMessage(error: unknown) {
  const authError = (error ?? {}) as { code?: string; message?: string }
  const code = authError.code?.toLowerCase() ?? ""
  const message = authError.message?.toLowerCase() ?? ""

  if (code === "same_password" || message.includes("different from the old password")) {
    return "You cannot use your previous password. Enter a fresh one."
  }
  if (
    code === "weak_password" ||
    code === "password_too_short" ||
    (message.includes("password") && (message.includes("weak") || message.includes("at least") || message.includes("minimum")))
  ) {
    return "Choose a stronger password with at least 8 characters."
  }
  if (
    code === "session_not_found" ||
    code === "otp_expired" ||
    code === "invalid_token" ||
    message.includes("expired") ||
    (message.includes("token") && message.includes("invalid"))
  ) {
    return "Your reset link has expired. Request a new one to continue."
  }

  return "We couldn't update your password. Please try again or request a new reset link."
}

type RecoveryClient = ReturnType<typeof createRecoveryClient>
type LinkResult = { email: string } | { error: true }

// Dedupes the one-time code exchange if the effect runs twice (React strict mode).
const linkChecks = new Map<string, Promise<LinkResult>>()

/**
 * Verifies the recovery link in the URL and returns the account it belongs to.
 * Only a valid link counts: an existing signed-in session is never reused, otherwise the
 * reset would change the password of whichever account was already logged in.
 */
function verifyRecoveryLink(supabase: RecoveryClient, url: URL): Promise<LinkResult> {
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""))
  if (url.searchParams.get("error") || url.searchParams.get("error_code") || hash.get("error") || hash.get("error_code")) {
    return Promise.resolve({ error: true })
  }

  const code = url.searchParams.get("code")
  const accessToken = hash.get("access_token")
  const refreshToken = hash.get("refresh_token")
  const key = code ?? accessToken
  if (!key) return Promise.resolve({ error: true })

  const existing = linkChecks.get(key)
  if (existing) return existing

  const check = (async (): Promise<LinkResult> => {
    const { data, error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : hash.get("type") === "recovery" && refreshToken
        ? await supabase.auth.setSession({ access_token: accessToken!, refresh_token: refreshToken })
        : { data: { session: null }, error: true }
    const email = data.session?.user.email
    return error || !email ? { error: true } : { email }
  })()
  linkChecks.set(key, check)
  return check
}

export default function ResetPasswordPage() {
  const [ready, setReady] = useState<"checking" | "ready" | "expired">("checking")
  const [accountEmail, setAccountEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [message, setMessage] = useState("")
  const requestInFlight = useRef(false)
  const clientRef = useRef<RecoveryClient | null>(null)

  useEffect(() => {
    let active = true
    // Read the link before anything can rewrite the URL.
    const url = new URL(window.location.href)
    const supabase = clientRef.current ?? createRecoveryClient()
    clientRef.current = supabase

    verifyRecoveryLink(supabase, url)
      .then((result) => {
        // Remove one-time tokens from the address bar and browser history.
        window.history.replaceState(null, "", url.pathname)
        clearPendingRecovery()
        if (!active) return
        if ("email" in result) {
          setAccountEmail(result.email)
          setReady("ready")
        } else {
          setReady("expired")
        }
      })
      .catch(() => { if (active) setReady("expired") })

    return () => { active = false }
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
      const supabase = clientRef.current
      if (!supabase) { setReady("expired"); return }
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setMessage(getPasswordUpdateErrorMessage(error))
        return
      }
      // End the recovery session so the user signs in with the new password.
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined)
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
            <p className="-mt-2 text-sm text-muted-foreground">Setting a new password for <span className="font-semibold text-foreground">{accountEmail}</span></p>
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
