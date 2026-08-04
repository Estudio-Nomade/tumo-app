"use client"

import type { ReactNode } from "react"
import type { Business } from "@/lib/modules"
import { BusinessProvider } from "@/shell/context/business"

export default function DashboardLayout({
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
            display: "flex",
            minHeight: "100vh",
          } as React.CSSProperties
        }
      >
        <aside
          style={{
            width: 240,
            borderRight: "1px solid #e5e7eb",
            padding: 16,
          }}
        >
          <div style={{ fontWeight: 700 }}>{business.name}</div>
          <nav style={{ marginTop: 24 }}>
            <div>Dashboard</div>
            <div>Fidelización</div>
          </nav>
        </aside>
        <main style={{ flex: 1, padding: 24 }}>{children}</main>
      </div>
    </BusinessProvider>
  )
}
