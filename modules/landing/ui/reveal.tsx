"use client"

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react"

type Props = {
  children: ReactNode
  className?: string
  delayMs?: number
  as?: "div" | "section" | "article" | "li"
}

export function Reveal({
  children,
  className = "",
  delayMs = 0,
  as = "div",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const Tag = as

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      el.setAttribute("data-landing-reveal", "in")
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-landing-reveal", "in")
            io.unobserve(entry.target)
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    )

    io.observe(el)
    return () => io.disconnect()
  }, [])

  const style: CSSProperties | undefined = delayMs
    ? { ["--reveal-delay" as string]: `${delayMs}ms` }
    : undefined

  return (
    <Tag
      ref={ref as never}
      data-landing-reveal=""
      className={className}
      style={style}
    >
      {children}
    </Tag>
  )
}
