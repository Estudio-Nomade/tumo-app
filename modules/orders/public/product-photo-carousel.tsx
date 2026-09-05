"use client"

import { useEffect, useRef, useState } from "react"

export type ProductPhotoSlide = {
  id?: string
  url: string
}

export default function ProductPhotoCarousel({
  photos,
  alt,
}: {
  photos: ProductPhotoSlide[]
  alt: string
}) {
  const urls = photos.map((p) => p.url).filter(Boolean)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || urls.length < 2) return
    const onScroll = () => {
      const w = el.clientWidth || 1
      const i = Math.round(el.scrollLeft / w)
      setIndex(Math.max(0, Math.min(urls.length - 1, i)))
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [urls.length])

  if (urls.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-[#F5F5F4] text-[var(--color-muted-public,#78716C)]">
        <span className="text-base">Sin foto</span>
      </div>
    )
  }

  if (urls.length === 1) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-[#F5F5F4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[0]} alt={alt} className="h-full w-full object-cover" />
      </div>
    )
  }

  function go(delta: number) {
    const el = scrollerRef.current
    if (!el) return
    const next = Math.max(0, Math.min(urls.length - 1, index + delta))
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" })
    setIndex(next)
  }

  return (
    <div className="relative w-full">
      <div
        ref={scrollerRef}
        className="flex aspect-[4/3] w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {urls.map((url, i) => (
          <div
            key={photos[i]?.id ?? `${url}-${i}`}
            className="h-full w-full shrink-0 snap-center snap-always"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={alt} className="h-full w-full object-cover" />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Foto anterior"
        onClick={() => go(-1)}
        disabled={index <= 0}
        className="absolute left-2 top-1/2 flex min-h-[48px] min-w-[48px] -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-stone-900 shadow disabled:opacity-40"
      >
        ←
      </button>
      <button
        type="button"
        aria-label="Foto siguiente"
        onClick={() => go(1)}
        disabled={index >= urls.length - 1}
        className="absolute right-2 top-1/2 flex min-h-[48px] min-w-[48px] -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-stone-900 shadow disabled:opacity-40"
      >
        →
      </button>

      <p
        className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-sm font-semibold text-white"
        aria-live="polite"
      >
        {index + 1} / {urls.length}
      </p>
    </div>
  )
}
