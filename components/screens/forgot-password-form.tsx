"use client"

import { useRef, useState, type FormEvent } from "react"
import { LoaderCircle } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { PrimaryButton } from "@/components/app/ui"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { RECOVERY_FLAG } from "@/lib/auth-recovery"

const confirmation = "If that email exists, a reset link has been sent. Check your inbox and spam folder."

export function ForgotPasswordForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail)
  const [locked, setLocked] = useState(Boolean(initialEmail))
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"error" | "success">("success")
  const [sent, setSent] = useState(false)
  const requestInFlight = useRef(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (requestInFlight.current) return

    requestInFlight.current = true
    setLoading(true)
    setMessage("")
    setSent(false)

    try {
      // Implicit flow on purpose: the link then carries its own one-time session, so it works
      // on ANY device or browser (e.g. opened from the Gmail app on a phone). The default PKCE
      // flow only works in the exact browser that requested the email.
      const recovery = createSupabaseClient(process.env.NEXT_PUBLIC_APP_SUPABASE_URL!, process.env.NEXT_PUBLIC_APP_SUPABASE_PUBLISHABLE_KEY!, {
        auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
      const { error } = await recovery.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      // If Supabase falls back to the Site URL (redirect URL not allow-listed), the home page
      // uses this marker to forward the recovery code to /reset-password instead of the splash.
      try { window.localStorage.setItem(RECOVERY_FLAG, String(Date.now())) } catch { /* storage unavailable */ }

      if (error) {
        const { code, status } = error as { code?: string; status?: number }
        setMessageType("error")
        setMessage(code === "over_email_send_rate_limit" || status === 429
          ? "Too many requests. Please wait a moment before trying again."
          : "We couldn't send a reset link right now. Please try again.")
        return
      }

      setMessageType("success")
      setMessage(confirmation)
      setSent(true)
    } catch {
      setMessageType("error")
      setMessage("We couldn't send a reset link right now. Please try again.")
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
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Forgot password?</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Enter your email and we&apos;ll send you a secure reset link.</p>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5">
          <label className="block text-sm font-semibold text-foreground" htmlFor="reset-email">
            Email address
            <input
              id="reset-email"
              required
              type="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setMessage(""); setSent(false) }}
              readOnly={locked}
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3.5 text-sm font-medium outline-none transition read-only:bg-secondary read-only:text-muted-foreground focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"
            />
          </label>

          {locked ? (
            <p className="-mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-muted-foreground" aria-live="polite">
              <span>Sending reset link to <strong className="font-semibold text-foreground">{email}</strong></span>
              <button
                type="button"
                onClick={() => { setLocked(false); setMessage(""); setSent(false) }}
                className="rounded-sm font-semibold text-brand underline-offset-4 transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Not this account? Switch email
              </button>
            </p>
          ) : null}

          {message ? (
            <p
              role={messageType === "error" ? "alert" : "status"}
              aria-live={messageType === "error" ? "assertive" : "polite"}
              className={messageType === "success"
                ? "rounded-2xl border border-success/20 bg-success-soft px-4 py-3 text-sm font-medium text-success"
                : "rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"}
            >
              {message}
            </p>
          ) : null}
          {sent ? (
            <p className="-mt-3 text-xs leading-relaxed text-muted-foreground">
              Can&apos;t find our email? Please check your spam or junk folder too.
            </p>
          ) : null}

          <PrimaryButton type="submit" disabled={loading || sent} className="min-h-12 rounded-2xl">
            {loading ? <><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Sending reset link...</> : sent ? "Reset link sent" : "Send reset link"}
          </PrimaryButton>
        </form>
        <a href="/?auth=login" className="mt-5 block rounded-sm text-center text-sm font-semibold text-brand transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Back to login</a>
      </section>
    </main>
  )
}
