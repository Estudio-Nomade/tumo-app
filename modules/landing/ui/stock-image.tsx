"use client"

import { useEffect, useRef, useState } from "react"

type Props = {
  src: string
  alt: string
  mediaId: string
  className?: string
  imgClassName?: string
  priority?: boolean
}

/**
 * Imagen local/stock sin next/image.
 * Importante: si el browser ya la tiene en cache, onLoad puede no disparar
 * tras hidratar — por eso checamos img.complete en useEffect.
 */
export function StockImage({
  src,
  alt,
  mediaId,
  className = "",
  imgClassName = "",
  priority = false,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    if (img.complete && img.naturalWidth > 0) {
      setLoaded(true)
    }
  }, [src])

  return (
    <div
      className={`relative overflow-hidden bg-[#0A0A0A] ${className}`}
      data-landing-media={mediaId}
      data-landing-img={loaded ? "loaded" : "loading"}
    >
      <div
        className={[
          "landing-img-skeleton absolute inset-0 transition-opacity duration-500",
          loaded ? "pointer-events-none opacity-0" : "opacity-100",
        ].join(" ")}
        aria-hidden
      />
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={[
          "h-full w-full object-cover transition-opacity duration-700",
          loaded ? "opacity-100" : "opacity-0",
          imgClassName,
        ].join(" ")}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </div>
  )
}
