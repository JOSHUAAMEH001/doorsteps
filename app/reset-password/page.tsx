"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { PrimaryButton } from "@/components/app/ui"
import { createClient } from "@/lib/supabase/client"
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

export default function ResetPasswordPage() {
  const router = useRouter()
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
    // Read the link BEFORE creating the client, so nothing can strip the tokens from the URL first.
    const url = new URL(window.location.href)
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""))
    const accessToken = hash.get("access_token")
    const refreshToken = hash.get("refresh_token")
    const code = url.searchParams.get("code")
    const linkError = url.searchParams.get("error_code") || hash.get("error_code") || url.searchParams.get("error") || hash.get("error")
    // Remove tokens from the address bar (they shouldn't sit in history). Run after Next.js has
    // finished its own first URL sync, otherwise it puts the hash back.
    const clearUrl = () => { if (accessToken || code || linkError) router.replace(url.pathname, { scroll: false }) }

    const supabase = createClient()
    let active = true

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === "PASSWORD_RECOVERY" || session) setReady("ready")
    })

    const hasSession = async () => Boolean((await supabase.auth.getSession()).data.session)

    const checkSession = async () => {
      try {
        // Cross-device links (implicit flow): #access_token=...&refresh_token=...&type=recovery
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          clearPendingRecovery()
          if (active) setReady(!error || (await hasSession()) ? "ready" : "expired")
          return
        }

        // Same-browser links (PKCE flow): ?code=...
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          clearPendingRecovery()
          if (active) setReady(!error || (await hasSession()) ? "ready" : "expired")
          return
        }

        // Expired or already-used link. If this browser already opened a valid link a moment
        // ago (e.g. the email was tapped twice), the person is signed in and can still continue.
        if (linkError) {
          if (active) setReady((await hasSession()) ? "ready" : "expired")
          return
        }

        const signedIn = await hasSession()
        if (signedIn) clearPendingRecovery()
        if (active) setReady(signedIn ? "ready" : "expired")
      } catch {
        if (active) setReady("expired")
      } finally {
        window.setTimeout(clearUrl, 50)
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
        setMessage(getPasswordUpdateErrorMessage(error))
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
            <p role="alert" className="mt-3 rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm text-destructive">This email link has expired or was already used. Each link works once, and only the newest email is valid. If you were resetting your password, get a new link below. If you were confirming your email, just log in.</p>
            <a href="/forgot-password" className="mt-6 flex min-h-12 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-bold text-brand-foreground">Send me a new reset link</a>
            <a href="/?auth=login" className="mt-3 block rounded-sm text-center text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Back to login</a>
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
