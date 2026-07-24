"use client"

import Image from "next/image"
import { useState } from "react"
import { PrimaryButton } from "@/components/app/ui"
import { useApp } from "@/lib/store"
import { cn } from "@/lib/utils"

const slides = [
  {
    image: "/onboarding-delivery.png",
    title: "Fast delivery to your doorstep",
    body: "Order food, groceries and more from vendors near ESUT Agbani and get it delivered in minutes.",
  },
  {
    image: "/onboarding-vendors.png",
    title: "Multiple local vendors",
    body: "Restaurants, supermarkets, grocery stores and local businesses — all in one app you can trust.",
  },
  {
    image: "/onboarding-track.png",
    title: "Track your order live",
    body: "Follow your rider in real time and know exactly when your order will arrive.",
  },
]

export function OnboardingScreen() {
  const { navigate } = useApp()
  const [index, setIndex] = useState(0)
  const isLast = index === slides.length - 1
  const slide = slides[index]

  return (
    <div className="flex h-full flex-col px-6 pb-8 pt-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => navigate("auth")}
          className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground"
        >
          Skip
        </button>
      </div>

      <div
        key={index}
        className="flex flex-1 flex-col items-center justify-center animate-fade-in-up"
      >
        <div className="relative flex h-64 w-64 items-center justify-center rounded-[2rem] bg-secondary">
          <Image
            src={slide.image || "/placeholder.svg"}
            alt={slide.title}
            width={220}
            height={220}
            className="h-56 w-56 object-contain"
            priority
          />
        </div>
        <h2 className="mt-10 text-balance text-center text-2xl font-extrabold tracking-tight text-foreground">
          {slide.title}
        </h2>
        <p className="mt-3 max-w-[300px] text-pretty text-center text-sm leading-relaxed text-muted-foreground">
          {slide.body}
        </p>
      </div>

      <div className="mb-8 flex items-center justify-center gap-2">
        {slides.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 rounded-full transition-all",
              i === index ? "w-6 bg-brand" : "w-2 bg-border",
            )}
          />
        ))}
      </div>

      <PrimaryButton
        onClick={() => (isLast ? navigate("auth") : setIndex((i) => i + 1))}
      >
        {isLast ? "Get Started" : "Next"}
      </PrimaryButton>
    </div>
  )
}
