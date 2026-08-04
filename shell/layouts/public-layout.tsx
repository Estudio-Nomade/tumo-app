"use client"

import type { ReactNode } from "react"
import type { Business } from "@/lib/modules"
import { BusinessProvider } from "@/shell/context/business"

export default function PublicLayout({
  business,
  children,
}: {
  business: Business
  children: ReactNode
}) {
  return (
    <BusinessProvider business={business}>
      <div
        style={
          {
            ["--color-primary" as string]: business.primary_color,
            ["--color-secondary" as string]: business.secondary_color,
            minHeight: "100vh",
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </BusinessProvider>
  )
}
