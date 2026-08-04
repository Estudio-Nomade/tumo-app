"use client"

import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { Business } from "@/lib/modules"
import { BusinessProvider } from "@/shell/context/business"

type SidebarModule = { id: string; name: string; icon: string }

type NavItem = {
  href: string
  label: string
  icon: string
  exact?: boolean
}

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function DashboardLayout({
  business,
  role,
  modules,
  employeeName,
  children,
}: {
  business: Business
  role: string
  modules: SidebarModule[]
  employeeName?: string
  children: ReactNode
}) {
  const showDashboard = role === "owner"
  const slug = business.slug
  const pathname = usePathname()
  const router = useRouter()
  const displayName =
    employeeName?.trim() || (role === "owner" ? "Dueño" : "Empleado")
  const initial = (displayName[0] ?? "U").toUpperCase()
  const businessInitial = (business.name?.trim()?.[0] ?? "T").toUpperCase()

  const navItems: NavItem[] = [
    ...(showDashboard
      ? [
          {
            href: `/${slug}/dashboard`,
            label: "Dashboard",
            icon: "▣",
            exact: true,
          },
        ]
      : []),
    ...modules.map((mod) => ({
      href: `/${slug}/dashboard/${mod.id}`,
      label: mod.name,
      icon: mod.icon,
      exact: true,
    })),
  ]

  async function onLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" })
      if (!res.ok) return
      router.push(`/${slug}/login`)
      router.refresh()
    } catch {
      // keep session UI if logout request fails
    }
  }

  return (
    <BusinessProvider business={business}>
      <div
        className="flex min-h-[100dvh] bg-white text-stone-900"
        style={
          {
            ["--color-primary" as string]: business.primary_color,
            ["--color-secondary" as string]: business.secondary_color,
          } as CSSProperties
        }
      >
        <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-stone-200 bg-[#F9FAFB] md:flex">
          <div className="flex flex-col items-center gap-3 px-5 pt-8 pb-5">
            {business.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo}
                alt={business.name}
                className="h-20 w-20 rounded-[22px] object-cover shadow-sm"
              />
            ) : (
              <div
                aria-hidden
                className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-[var(--color-primary,#F97316)] text-2xl font-extrabold text-white shadow-sm"
              >
                {businessInitial}
              </div>
            )}
            <div className="text-center text-sm font-bold text-stone-900">
              {business.name}
            </div>
          </div>

          <div className="mx-5 border-t border-stone-200" />

          <nav
            aria-label="Navegación principal"
            className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4"
          >
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-[var(--color-primary,#F97316)] text-white shadow-sm"
                      : "text-stone-600 hover:bg-stone-200/60 hover:text-stone-900"
                  }`}
                >
                  <span aria-hidden className="text-base leading-none">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mx-5 border-t border-stone-200" />

          <div className="flex items-center gap-3 px-4 py-5">
            <div
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 text-sm font-bold text-white"
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-stone-900">
                {displayName}
              </div>
              <button
                type="button"
                onClick={() => void onLogout()}
                className="text-xs font-semibold text-stone-500 transition hover:text-[var(--color-primary,#F97316)]"
              >
                Salir
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 md:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              {business.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={business.logo}
                  alt=""
                  className="h-9 w-9 rounded-[11px] object-cover"
                />
              ) : (
                <div
                  aria-hidden
                  className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[var(--color-primary,#F97316)] text-sm font-bold text-white"
                >
                  {businessInitial}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-stone-900">
                  {business.name}
                </div>
                <div className="truncate text-xs text-stone-500">
                  {displayName}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void onLogout()}
              className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700"
            >
              Salir
            </button>
          </header>

          <main
            className={`flex-1 px-4 py-5 md:px-8 md:py-8 ${
              navItems.length > 0 ? "pb-28 md:pb-8" : "pb-5 md:pb-8"
            }`}
          >
            {children}
          </main>
        </div>

        {navItems.length > 0 ? (
          <nav
            aria-label="Navegación principal"
            className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
          >
            <div className="mx-auto flex max-w-md items-stretch gap-1 overflow-x-auto rounded-[36px] border border-stone-200 bg-white p-1 shadow-sm">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href, item.exact)
                return (
                  <Link
                    key={`m-${item.href}`}
                    href={item.href}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    title={item.label}
                    className={`flex h-12 min-w-12 flex-1 items-center justify-center rounded-[26px] text-lg transition ${
                      active
                        ? "bg-[var(--color-primary,#F97316)] text-white"
                        : "text-stone-500"
                    }`}
                  >
                    <span aria-hidden>{item.icon}</span>
                  </Link>
                )
              })}
            </div>
          </nav>
        ) : null}
      </div>
    </BusinessProvider>
  )
}
