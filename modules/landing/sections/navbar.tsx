"use client"

import { useEffect, useState } from "react"
import { LandingLogo } from "../logo"
import { NAV_LINKS, whatsappHref, DEFAULT_WA_MESSAGE } from "../config"

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      data-landing-nav={scrolled ? "scrolled" : ""}
      className="sticky top-0 z-50 bg-[#000000]/80 backdrop-blur-[16px]"
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-5 md:h-16">
        <a href="#top" aria-label="Tumo inicio" className="min-w-0 shrink">
          <LandingLogo />
        </a>
        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label="Secciones"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-base text-[#A3A3A3] transition-colors hover:text-[#FFFFFF]"
            >
              {link.label}
            </a>
          ))}
        </nav>
        {/* Link quieto: el CTA fuerte vive en el hero, no acá */}
        <a
          href={whatsappHref(DEFAULT_WA_MESSAGE)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full border border-[#262626] px-3.5 py-2 text-sm font-medium text-[#D4D4D4] transition-colors hover:border-[#7754E3] hover:text-[#FFFFFF] md:px-4 md:text-[15px]"
        >
          Escribinos
        </a>
      </div>
    </header>
  )
}
