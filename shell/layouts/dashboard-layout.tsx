"use client"

import type { CSSProperties, ComponentType, ReactNode, SVGProps } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Activity,
  Gift,
  LayoutDashboard,
  Sandwich,
  Settings,
} from "lucide-react"
import type { Business } from "@/lib/modules"
import { BusinessProvider } from "@/shell/context/business"

type SidebarModule = { id: string; name: string; icon: string }

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const MODULE_ICONS: Record<string, LucideIcon> = {
  gift: Gift,
  Gift: Gift,
  layout: LayoutDashboard,
  activity: Activity,
  settings: Settings,
}

function resolveModuleIcon(name: string): LucideIcon {
  return MODULE_ICONS[name] ?? LayoutDashboard
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
  const isOwner = role === "owner"
  const slug = business.slug
  const pathname = usePathname()
  const router = useRouter()
  const displayName =
    employeeName?.trim() || (isOwner ? "Dueño" : "Empleado")
  const initial = (displayName[0] ?? "U").toUpperCase()
  const locationLabel = business.location?.trim() || ""

  const navItems: NavItem[] = isOwner
    ? [
        {
          href: `/${slug}/dashboard`,
          label: "Panel",
          icon: LayoutDashboard,
          exact: true,
        },
        {
          href: `/${slug}/dashboard/activity`,
          label: "Actividad",
          icon: Activity,
        },
        {
          href: `/${slug}/dashboard/settings`,
          label: "Ajustes",
          icon: Settings,
        },
      ]
    : modules.map((mod) => ({
        href: `/${slug}/dashboard/${mod.id}`,
        label: mod.name,
        icon: resolveModuleIcon(mod.icon),
        exact: true,
      }))

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
            ["--color-primary-deep" as string]: business.primary_color,
            ["--color-secondary" as string]: business.secondary_color,
          } as CSSProperties
        }
      >
        <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-[#E7E5E4] bg-white md:flex">
          <div className="flex flex-col items-center gap-3 px-5 pt-8 pb-5">
            {business.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo}
                alt={business.name}
                className="h-16 w-16 rounded-[18px] object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-[var(--color-primary,#F97316)] text-white"
              >
                <Sandwich size={28} strokeWidth={2} />
              </div>
            )}
            <div className="text-center text-sm font-bold text-stone-900">
              {business.name}
            </div>
          </div>

          <div className="mx-5 border-t border-[#E7E5E4]" />

          <nav
            aria-label="Navegación principal"
            className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4"
          >
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href, item.exact)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-[var(--color-primary,#F97316)] text-white"
                      : "text-stone-500 hover:bg-[#F5F5F4] hover:text-stone-900"
                  }`}
                >
                  <Icon size={18} strokeWidth={2} aria-hidden />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mx-5 border-t border-[#E7E5E4]" />

          <div className="flex items-center gap-3 px-4 py-5">
            <div
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1C1917] text-sm font-bold text-white"
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
          <header className="flex items-center justify-between gap-3 px-5 pt-2 pb-1 md:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              {business.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={business.logo}
                  alt=""
                  className="h-[38px] w-[38px] rounded-[11px] object-cover"
                />
              ) : (
                <div
                  aria-hidden
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[var(--color-primary,#F97316)] text-white"
                >
                  <Sandwich size={20} strokeWidth={2} />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-stone-900">
                  {business.name}
                </div>
                {locationLabel ? (
                  <div className="truncate text-[11px] text-stone-500">
                    {locationLabel}
                  </div>
                ) : null}
              </div>
            </div>
            <div
              aria-label={displayName}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#1C1917] text-base font-bold text-white"
            >
              {initial}
            </div>
          </header>

          <main
            className={`flex-1 px-5 py-2 md:px-8 md:py-8 ${
              navItems.length > 0 ? "pb-28 md:pb-8" : "pb-5 md:pb-8"
            }`}
          >
            {children}
          </main>
        </div>

        {navItems.length > 0 ? (
          <nav
            aria-label="Navegación principal"
            className="fixed inset-x-0 bottom-0 z-20 bg-transparent px-[21px] pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:hidden"
          >
            <div className="mx-auto flex h-[62px] max-w-md items-stretch gap-1 rounded-[36px] border border-[#E7E5E4] bg-white p-1">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href, item.exact)
                const Icon = item.icon
                return (
                  <Link
                    key={`m-${item.href}`}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-[26px] px-1 transition ${
                      active
                        ? "bg-[var(--color-primary,#F97316)] text-white"
                        : "bg-white text-[#78716C]"
                    }`}
                  >
                    <Icon size={18} strokeWidth={2} aria-hidden />
                    <span className="max-w-full truncate text-[10px] font-semibold tracking-wide">
                      {item.label}
                    </span>
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
