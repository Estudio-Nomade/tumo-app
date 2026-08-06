"use client"

import type { ReactNode } from "react"
import type { Business } from "@/lib/modules"
import { publicBrandCssVars } from "@/shell/brand/public-tokens"
import { BusinessProvider } from "@/shell/context/business"

export default function PublicLayout({
  business,
  children,
}: {
  business: Business
  children: ReactNode
}) {
  const brandVars = publicBrandCssVars({
    primary_color: business.primary_color,
    secondary_color: business.secondary_color,
    surface_color: business.surface_color,
  })

  return (
    <BusinessProvider business={business}>
      <div
        style={
          {
            ["--color-primary" as string]: business.primary_color,
            ["--primary" as string]: business.primary_color,
            ["--primary-foreground" as string]: "#ffffff",
            ["--color-secondary" as string]: business.secondary_color,
            ...brandVars,
            minHeight: "100vh",
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </BusinessProvider>
  )
}
