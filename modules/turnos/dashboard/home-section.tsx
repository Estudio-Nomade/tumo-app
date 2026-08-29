import type { Business } from "@/lib/modules"
import { getMetrics } from "@/modules/turnos/api/metrics"
import { metricsDeps } from "@/modules/turnos/lib/default-deps"

export async function TurnosHomeSection({
  slug,
  business,
}: {
  slug: string
  business: Business
}) {
  const result = await getMetrics(metricsDeps, { businessId: business.id })
  if (result.status !== 200) return null

  const metrics = result.body as {
    turnosToday: number
    pendingPayment: number
  }

  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-[#E7E5E4] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-stone-900">Turnos</h2>
        <a
          href={`/${slug}/dashboard/turnos`}
          className="inline-flex min-h-[48px] items-center text-base font-semibold text-[var(--color-primary,#F97316)]"
        >
          Ver turnos
        </a>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#FFF7ED] p-3">
          <p className="text-sm text-stone-600">Hoy</p>
          <p className="text-2xl font-bold text-[var(--color-primary,#F97316)]">
            {metrics.turnosToday}
          </p>
        </div>
        <div className="rounded-xl bg-[#FFFBEB] p-3">
          <p className="text-sm text-stone-600">Pend. pago</p>
          <p className="text-2xl font-bold text-[#B45309]">
            {metrics.pendingPayment}
          </p>
        </div>
      </div>
    </section>
  )
}
