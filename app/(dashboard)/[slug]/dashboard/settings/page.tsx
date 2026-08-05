import { cookies } from "next/headers"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { validateSession } from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"
import LogoutButton from "@/shell/ui/logout-button"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function DashboardSettingsPage({ params }: PageProps) {
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

  const initial = (session.name?.trim()?.[0] ?? "U").toUpperCase()

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <header className="flex flex-col gap-0.5">
        <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
          Ajustes
        </h1>
        <p className="text-[13px] text-stone-500">
          Tu comercio y tu cuenta
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          Negocio
        </div>
        <div className="flex items-center gap-3">
          {business.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logo}
              alt=""
              className="h-12 w-12 rounded-[14px] object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--color-primary,#F97316)] text-lg font-bold text-white"
            >
              {(business.name?.trim()?.[0] ?? "T").toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-stone-900">
              {business.name}
            </div>
            {business.location?.trim() ? (
              <div className="truncate text-xs text-stone-500">
                {business.location}
              </div>
            ) : (
              <div className="text-xs text-stone-400">/{business.slug}</div>
            )}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Colores de marca
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span
              className="h-8 w-8 rounded-lg border border-[#E7E5E4]"
              style={{ backgroundColor: business.primary_color }}
              title="Primario"
            />
            <span
              className="h-8 w-8 rounded-lg border border-[#E7E5E4]"
              style={{ backgroundColor: business.secondary_color }}
              title="Secundario"
            />
            <span className="text-xs text-stone-500">
              {business.primary_color} · {business.secondary_color}
            </span>
          </div>
          <p className="mt-2 text-xs text-stone-400">
            Solo lectura por ahora. Para cambiar datos del negocio, contactá a
            soporte Tumo.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          Cuenta
        </div>
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1C1917] text-sm font-bold text-white"
          >
            {initial}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-stone-900">
              {session.name?.trim() || "Dueño"}
            </div>
            <div className="text-xs text-stone-500">Dueño del comercio</div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-[#E7E5E4] bg-[#F5F5F4] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          Módulos
        </div>
        <p className="text-sm text-stone-600">
          La configuración y herramientas de cada módulo (QR, reglas de
          premios, etc.) están dentro del módulo.
        </p>
        <Link
          href={`/${slug}/dashboard/modules`}
          className="text-sm font-semibold text-[var(--color-primary,#F97316)]"
        >
          Ver módulos →
        </Link>
      </section>

      <LogoutButton
        slug={slug}
        className="w-full rounded-2xl border border-[#E7E5E4] bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-[var(--color-primary,#F97316)] hover:text-[var(--color-primary,#F97316)]"
      />
    </div>
  )
}
