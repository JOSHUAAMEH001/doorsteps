"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

function toImageSlug(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function CatalogImage({
  name,
  imageUrl,
  sizes,
  priority = false,
  className = "object-cover",
  fallbackClassName = "text-lg",
}: {
  name: string
  imageUrl?: string | null
  sizes: string
  priority?: boolean
  className?: string
  fallbackClassName?: string
}) {
  const localImage = `/menu/${toImageSlug(name)}.jpg`
  const [src, setSrc] = useState(imageUrl || localImage)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setSrc(imageUrl || localImage)
    setFailed(false)
  }, [imageUrl, localImage])

  if (failed) {
    return (
      <div role="img" aria-label={name} className={`absolute inset-0 flex items-center justify-center bg-[#EE0000] px-4 text-center font-extrabold text-white ${fallbackClassName}`}>
        {name}
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={name}
      fill
      priority={priority}
      sizes={sizes}
      className={className}
      onError={() => {
        if (imageUrl && src === imageUrl && localImage !== imageUrl) {
          setSrc(localImage)
        } else {
          setFailed(true)
        }
      }}
    />
  )
}
