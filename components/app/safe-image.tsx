"use client"

import Image, { type ImageProps } from "next/image"
import { useState } from "react"

export function SafeImage({ alt, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#EE0000] p-3 text-center text-sm font-bold text-white">
        {alt || "Image unavailable"}
      </div>
    )
  }

  return <Image {...props} alt={alt} onError={() => setFailed(true)} />
}
