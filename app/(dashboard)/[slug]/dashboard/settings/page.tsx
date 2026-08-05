import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import ShareProgram from "@/modules/loyalty/dashboard/share-program"
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

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <header className="flex flex-col gap-0.5">
        <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
          Ajustes
        </h1>
        <p className="text-[13px] text-stone-500">Programa y cuenta</p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Negocio
          </div>
          <div className="mt-1 text-sm font-semibold text-stone-900">
            {business.name}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Regla del programa
          </div>
          <div className="mt-1 text-sm font-semibold text-stone-900">
            {business.purchases_needed} compras → {business.reward_name}
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Solo lectura por ahora. Para cambiarlo, contactá a soporte Tumo.
          </p>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Colores
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
        </div>
      </section>

      <ShareProgram business={business} />

      <LogoutButton
        slug={slug}
        className="w-full rounded-2xl border border-[#E7E5E4] bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-[var(--color-primary,#F97316)] hover:text-[var(--color-primary,#F97316)]"
      />
    </div>
  )
}
