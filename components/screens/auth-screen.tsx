"use client"

import { useRef, useState } from "react"
import { Logo } from "@/components/brand/logo"
import { PrimaryButton } from "@/components/app/ui"
import { useApp } from "@/lib/store"

export function AuthScreen() {
  const { navigate, signIn } = useApp()
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState(["", "", "", ""])
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  const phoneValid = phone.replace(/\D/g, "").length >= 10

  function handleOtpChange(i: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1)
    setOtp((prev) => {
      const next = [...prev]
      next[i] = digit
      return next
    })
    if (digit && i < 3) inputs.current[i + 1]?.focus()
  }

  return (
    <div className="flex h-full flex-col px-6 pb-8 pt-10">
      <Logo size="md" showTagline />

      {step === "phone" ? (
        <div className="mt-10 flex flex-1 flex-col">
          <h1 className="text-balance text-2xl font-extrabold tracking-tight text-foreground">
            Welcome
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Sign in with your phone number to start ordering across ESUT Agbani.
          </p>

          <div className="mt-8">
            <label className="text-xs font-semibold text-muted-foreground">
              Phone number
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-1 focus-within:border-brand">
              <span className="flex items-center gap-1.5 border-r border-border pr-3 text-sm font-semibold text-foreground">
                <span aria-hidden>🇳🇬</span> +234
              </span>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="801 234 5678"
                className="flex-1 bg-transparent py-3 text-sm font-medium outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <PrimaryButton disabled={!phoneValid} onClick={() => setStep("otp")}>
              Send verification code
            </PrimaryButton>

            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <PrimaryButton
              variant="outline"
              onClick={() => {
                signIn("Chidera")
                navigate("home")
              }}
            >
              <GoogleIcon />
              Continue with Google
            </PrimaryButton>
            <button
              type="button"
              onClick={() => {
                signIn("Guest", true)
                navigate("home")
              }}
              className="w-full py-2 text-center text-sm font-semibold text-muted-foreground"
            >
              Continue as guest
            </button>
            <p className="px-4 text-center text-[11px] leading-relaxed text-muted-foreground">
              By continuing you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-10 flex flex-1 flex-col">
          <h1 className="text-balance text-2xl font-extrabold tracking-tight text-foreground">
            Verify your number
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Enter the 4-digit code sent to{" "}
            <span className="font-semibold text-foreground">+234 {phone || "801 234 5678"}</span>.
          </p>

          <div className="mt-8 flex justify-center gap-3">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el
                }}
                value={digit}
                inputMode="numeric"
                maxLength={1}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                className="h-16 w-14 rounded-2xl border border-border bg-background text-center text-2xl font-bold text-foreground outline-none focus:border-brand"
              />
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Didn&apos;t get a code?{" "}
            <button type="button" className="font-semibold text-brand">
              Resend
            </button>
          </p>

          <div className="mt-auto">
            <PrimaryButton
              onClick={() => {
                signIn("Chidera")
                navigate("home")
              }}
            >
              Verify & Continue
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}
