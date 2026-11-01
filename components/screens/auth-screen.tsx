"use client"

import { useState } from "react"
import { Logo } from "@/components/brand/logo"
import { PrimaryButton } from "@/components/app/ui"
import { useApp } from "@/lib/store"
import { createClient } from "@/lib/supabase/client"

export function AuthScreen() {
  const { navigate, signIn } = useApp()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSubmit() {
    if (!email.trim() || password.length < 6) {
      setMessage("Enter a valid email and a password with at least 6 characters.")
      return
    }

    setLoading(true)
    setMessage("")
    const supabase = createClient()
    const redirectTo = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: redirectTo },
        })

    setLoading(false)
    if (result.error) {
      setMessage(mode === "login" ? "Invalid email or password." : result.error.message)
      return
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Account created. Check your email to confirm your account, then log in.")
      setMode("login")
      return
    }

    signIn(email.split("@")[0] || "Customer")
    navigate("home")
  }

  return (
    <div className="flex h-full flex-col px-6 pb-8 pt-10">
      <Logo size="md" showTagline />
      <div className="mt-10 flex flex-1 flex-col">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {mode === "login" ? "Log in to order from nearby vendors." : "Sign up to place and track orders."}
        </p>

        <div className="mt-8 space-y-4">
          <label className="block text-xs font-semibold text-muted-foreground">
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium outline-none focus:border-brand"
            />
          </label>
          <label className="block text-xs font-semibold text-muted-foreground">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium outline-none focus:border-brand"
            />
          </label>
          {message ? <p className="rounded-2xl bg-brand-soft px-4 py-3 text-xs font-semibold text-brand">{message}</p> : null}
        </div>

        <div className="mt-auto space-y-3">
          <PrimaryButton onClick={handleSubmit} disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </PrimaryButton>
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage("") }}
            className="w-full py-2 text-center text-sm font-semibold text-brand"
          >
            {mode === "login" ? "New to Doorsteps? Create an account" : "Already have an account? Log in"}
          </button>
          <button
            type="button"
            onClick={() => { signIn("Guest", true); navigate("home") }}
            className="w-full py-2 text-center text-sm font-semibold text-muted-foreground"
          >
            Continue as guest
          </button>
        </div>
      </div>
    </div>
  )
}
