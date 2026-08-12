import type { CSSProperties } from "react"
import "./landing.css"
import { Navbar } from "./sections/navbar"
import { Reveal } from "./ui/reveal"
import { SectionRule } from "./ui/section-rule"
import { Hero } from "./sections/hero"
import { WorkshopSection } from "./sections/workshop"
import { ModulesSection } from "./sections/modules"
import { CasesSection } from "./sections/cases"
import { PricingSection } from "./sections/pricing"
import { FaqSection } from "./sections/faq"
import { CtaSection } from "./sections/cta"
import { FooterSection } from "./sections/footer"

const landingTokens = {
  ["--color-primary" as string]: "#7754E3",
  ["--primary" as string]: "#7754E3",
  ["--primary-foreground" as string]: "#ffffff",
  backgroundColor: "#000000",
  color: "#FFFFFF",
  minHeight: "100vh",
} as CSSProperties

export function LandingPage() {
  return (
    <div
      className="landing-grain w-full min-w-0 overflow-x-hidden font-[family-name:var(--font-geist-sans)] antialiased"
      style={landingTokens}
      data-landing-craft="page"
    >
      <Navbar />
      <main className="w-full min-w-0">
        <Hero />
        <SectionRule />
        <Reveal>
          <WorkshopSection />
        </Reveal>
        <SectionRule />
        <ModulesSection />
        <SectionRule />
        <CasesSection />
        <SectionRule />
        <Reveal>
          <PricingSection />
        </Reveal>
        <SectionRule />
        <Reveal>
          <FaqSection />
        </Reveal>
        <SectionRule />
        <Reveal>
          <CtaSection />
        </Reveal>
      </main>
      <FooterSection />
    </div>
  )
}
