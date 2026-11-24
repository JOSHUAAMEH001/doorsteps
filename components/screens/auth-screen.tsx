"use client"

import { useRef, useState, type FormEvent } from "react"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { mutate } from "swr"
import { Logo } from "@/components/brand/logo"
import { PrimaryButton } from "@/components/app/ui"
import { landingScreen, useApp } from "@/lib/store"
import { createClient } from "@/lib/supabase/client"
import { getCurrentProfile } from "@/app/actions/roles"

function authErrorMessage(error: unknown, mode: "login" | "signup") {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }

  if (code === "email_not_confirmed") {
    return "Please confirm your email address. Check your inbox for the link."
  }
  if (code === "weak_password") return "Choose a stronger password and try again."
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || status === 429) {
    return "Too many attempts. Please wait a moment and try again."
  }
  if (mode === "login" && code === "invalid_credentials") {
    return "Invalid email or password."
  }
  return mode === "login"
    ? "We couldn't sign you in right now. Please try again."
    : "We couldn't create your account right now. Please try again."
}

export function AuthScreen() {
  const { navigate, signIn, cart } = useApp()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"error" | "success">("error")
  const requestInFlight = useRef(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (requestInFlight.current) return

    const cleanName = fullName.replace(/\s+/g, " ").trim()
    if (mode === "signup" && cleanName.length < 2) {
      setMessageType("error")
      setMessage("Enter your name.")
      return
    }
    if (!email.trim() || password.length < 6) {
      setMessageType("error")
      setMessage("Enter a valid email and a password with at least 6 characters.")
      return
    }

    requestInFlight.current = true
    setLoading(true)
    setMessage("")

    try {
      const supabase = createClient()
      const redirectTo = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            // The name is saved to the customer's profile when the account is created.
            options: { emailRedirectTo: redirectTo, data: { full_name: cleanName.slice(0, 80) } },
          })

      if (result.error) {
        setMessageType("error")
        setMessage(authErrorMessage(result.error, mode))
        return
      }

      if (mode === "signup" && !result.data.session) {
        setMessageType("success")
        setMessage("Account created. Check your email to confirm your account, then log in.")
        setMode("login")
        setPassword("")
        return
      }

      signIn((mode === "signup" && cleanName) || email.split("@")[0] || "Customer")
      const profile = await getCurrentProfile()
      await mutate("current-profile", profile, { revalidate: false })
      const landing = landingScreen(profile.data?.role, cart.length > 0)
      // Customers without a cart keep landing on their orders, as before.
      navigate(landing === "home" ? "orders" : landing)
    } catch {
      setMessageType("error")
      setMessage(mode === "login"
        ? "We couldn't sign you in right now. Please try again."
        : "We couldn't create your account right now. Please try again.")
    } finally {
      requestInFlight.current = false
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col px-6 pb-8 pt-10 sm:px-8">
      <Logo size="md" showTagline />
      <div className="mt-10 flex flex-1 flex-col">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">DOORS delivery</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {mode === "login" ? "Log in to order from nearby vendors." : "Sign up to place and track orders."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-1 flex-col gap-5" noValidate={false}>
          {mode === "signup" ? (
            <label className="block text-sm font-semibold text-foreground" htmlFor="auth-name">
              Your name
              <input
                id="auth-name"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="e.g. Chika Eze"
                autoComplete="name"
                maxLength={80}
                required
                className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3.5 text-sm font-medium outline-none transition placeholder:text-muted-foreground/70 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"
              />
            </label>
          ) : null}
          <label className="block text-sm font-semibold text-foreground" htmlFor="auth-email">
            Email address
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3.5 text-sm font-medium outline-none transition placeholder:text-muted-foreground/70 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"
            />
          </label>

          <label className="block text-sm font-semibold text-foreground" htmlFor="auth-password">
            Password
            <span className="relative mt-2 block">
              <input
                id="auth-password"
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
                className="w-full rounded-2xl border border-input bg-background px-4 py-3.5 pr-12 text-sm font-medium outline-none transition focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"
              />
              <button
                type="button"
                onClick={() => setPasswordVisible((current) => !current)}
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                aria-pressed={passwordVisible}
                className="absolute inset-y-0 right-2 inline-flex size-10 items-center justify-center self-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {passwordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </span>
          </label>

          {mode === "login" ? (
            <a
              href={`/forgot-password?email=${encodeURIComponent(email)}`}
              className="self-end rounded-sm text-xs font-semibold text-brand underline-offset-4 transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Forgot password?
            </a>
          ) : null}

          {message ? (
            <p
              role={messageType === "error" ? "alert" : "status"}
              aria-live={messageType === "error" ? "assertive" : "polite"}
              className={messageType === "success"
                ? "rounded-2xl border border-success/20 bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                : "rounded-2xl border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive"}
            >
              {message}
            </p>
          ) : null}
          {messageType === "success" && message ? (
            <p className="-mt-3 text-xs leading-relaxed text-muted-foreground">
              Can&apos;t find our email? Please check your spam or junk folder too.
            </p>
          ) : null}

          <div className="mt-auto flex flex-col gap-3 pt-5">
            <PrimaryButton type="submit" disabled={loading} className="min-h-12 rounded-2xl">
              {loading ? <><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />{mode === "login" ? "Signing in..." : "Creating account..."}</> : mode === "login" ? "Log in" : "Create account"}
            </PrimaryButton>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login")
                setMessage("")
                setPassword("")
              }}
              className="w-full rounded-xl px-3 py-3 text-center text-sm font-semibold text-brand transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {mode === "login" ? "New to Doorsteps? Create an account" : "Already have an account? Log in"}
            </button>
            <button
              type="button"
              onClick={() => { signIn("Guest", true); navigate("home") }}
              className="w-full rounded-xl px-3 py-2 text-center text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Continue as guest
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
