"use client"

import { useState } from "react"

type Props = {
  src: string
  alt: string
  mediaId: string
  className?: string
  imgClassName?: string
  priority?: boolean
}

/** Imagen stock sin next/image + skeleton hasta onLoad */
export function StockImage({
  src,
  alt,
  mediaId,
  className = "",
  imgClassName = "",
  priority = false,
}: Props) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      className={`relative overflow-hidden bg-[#0A0A0A] ${className}`}
      data-landing-media={mediaId}
      data-landing-img={loaded ? "loaded" : "loading"}
    >
      <div
        className={[
          "landing-img-skeleton absolute inset-0 transition-opacity duration-500",
          loaded ? "opacity-0" : "opacity-100",
        ].join(" ")}
        aria-hidden
      />
      <img
        src={src}
        alt={alt}
        className={[
          "h-full w-full object-cover transition-opacity duration-700",
          loaded ? "opacity-100" : "opacity-0",
          imgClassName,
        ].join(" ")}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}
