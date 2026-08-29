import { cookies } from "next/headers"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Calendar, Gift, LayoutGrid, Receipt } from "lucide-react"
import {
  getActiveModules,
  getModuleDashboardHref,
} from "@/lib/modules"
import { validateSession } from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

const ICONS: Record<string, typeof Gift> = {
  gift: Gift,
  receipt: Receipt,
  calendar: Calendar,
}

export default async function ModulesHubPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)
  if (!business) notFound()

  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value
  if (!token) redirect(`/${slug}/login`)

  const session = await validateSession(token)
  if (!session || session.businessId !== business.id) {
    redirect(`/${slug}/login`)
  }

  if (session.role !== "owner") {
    redirect(`/${slug}/dashboard/loyalty`)
  }

  const modules = getActiveModules(business)

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <header className="flex flex-col gap-0.5">
        <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
          Módulos
        </h1>
        <p className="text-[13px] text-stone-500">
          Herramientas activas de tu comercio
        </p>
      </header>

      {modules.length === 0 ? (
        <div className="rounded-2xl border border-[#E7E5E4] bg-[#F5F5F4] px-4 py-10 text-center text-sm text-stone-500">
          No hay módulos activos.
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {modules.map((mod) => {
            const Icon = ICONS[mod.icon] ?? LayoutGrid
            const href = getModuleDashboardHref(slug, mod)
            return (
              <li key={mod.id}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-4 transition hover:border-[var(--color-primary,#F97316)]/40"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[var(--color-primary,#F97316)]">
                    <Icon size={22} strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-stone-900">
                      {mod.name}
                    </div>
                    <div className="text-xs text-stone-500">
                      Abrir panel de {mod.name.toLowerCase()}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
