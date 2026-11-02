"use client"

import { FormEvent, useState } from "react"
import { Logo } from "@/components/brand/logo"
import { PrimaryButton } from "@/components/app/ui"
import { createClient } from "@/lib/supabase/client"

const confirmation = "If that email exists, a reset link has been sent. Check your inbox and spam folder."

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage("")
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) console.error("[v0] password reset request failed", error)
    } catch (error) {
      console.error("[v0] password reset request crashed", error)
    } finally {
      setLoading(false)
      setMessage(confirmation)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm">
        <Logo size="md" showTagline />
        <h1 className="mt-10 text-2xl font-extrabold tracking-tight">Forgot password?</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Enter your email and we&apos;ll send you a secure reset link.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block text-xs font-semibold text-muted-foreground">
            Email address
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand" />
          </label>
          {message ? <p className="rounded-2xl bg-brand-soft px-4 py-3 text-xs font-semibold text-brand">{message}</p> : null}
          <PrimaryButton type="submit" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</PrimaryButton>
        </form>
        <a href="/" className="mt-5 block text-center text-sm font-semibold text-brand">Back to login</a>
      </div>
    </main>
  )
}
