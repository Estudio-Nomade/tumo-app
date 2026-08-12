"use client"

import { useEffect, useRef, type ReactNode } from "react"

/** Parallax leve en desktop; se apaga con reduced-motion */
export function ParallaxMedia({
  children,
  className = "",
  strength = 0.12,
}: {
  children: ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const desktop = window.matchMedia("(min-width: 768px)").matches
    if (reduce || !desktop) {
      el.style.transform = ""
      return
    }

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const viewH = window.innerHeight || 1
        const progress = (rect.top + rect.height / 2 - viewH / 2) / viewH
        const y = Math.max(-28, Math.min(28, -progress * strength * 100))
        el.style.transform = `translate3d(0, ${y}px, 0) scale(1.08)`
      })
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [strength])

  return (
    <div
      ref={ref}
      className={`landing-parallax will-change-transform ${className}`}
      data-landing-parallax=""
    >
      {children}
    </div>
  )
}
