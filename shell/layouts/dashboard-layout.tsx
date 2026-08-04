"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import type { Business } from "@/lib/modules"
import { BusinessProvider } from "@/shell/context/business"

type SidebarModule = { id: string; name: string; icon: string }

export default function DashboardLayout({
  business,
  role,
  modules,
  children,
}: {
  business: Business
  role: string
  modules: SidebarModule[]
  children: ReactNode
}) {
  const showDashboard = role === "owner"
  const slug = business.slug

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
          <nav
            style={{
              marginTop: 24,
              display: "grid",
              gap: 8,
            }}
          >
            {showDashboard ? (
              <Link href={`/${slug}/dashboard`}>Dashboard</Link>
            ) : null}
            {modules.map((mod) => (
              <Link
                key={mod.id}
                href={`/${slug}/dashboard/${mod.id === "loyalty" ? "loyalty" : mod.id}`}
              >
                <span aria-hidden>{mod.icon} </span>
                {mod.name}
              </Link>
            ))}
          </nav>
        </aside>
        <main style={{ flex: 1, padding: 24 }}>{children}</main>
      </div>
    </BusinessProvider>
  )
}
