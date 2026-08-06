import {
  getMetrics,
  getTopCustomers,
  getWeeklyRedemptions,
} from "@/modules/loyalty/api/metrics"
import { metricsDeps } from "@/modules/loyalty/lib/default-deps"
import type { Business } from "@/lib/modules"

export async function LoyaltyHomeSection({
  slug,
  business,
}: {
  slug: string
  business: Business
}) {
  const [metrics, weekly, closest] = await Promise.all([
    getMetrics(metricsDeps, { businessId: business.id }),
    getWeeklyRedemptions(metricsDeps, { businessId: business.id }),
    getTopCustomers(metricsDeps, {
      businessId: business.id,
      purchasesNeeded: business.purchases_needed,
      rewardName: business.reward_name,
      limit: 20,
    }),
  ])

  const readyCount = closest.filter((c) => c.canRedeem).length
  const goalTarget =
    weekly.lastWeek > 0
      ? weekly.lastWeek
      : weekly.thisWeek > 0
        ? weekly.thisWeek
        : 0
  const empty = metrics.customers === 0

  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-[#E7E5E4] bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-stone-900">Programa de premios</h2>

      {empty ? (
        <p className="text-base leading-relaxed text-stone-700">
          Todavía no hay clientes en el programa.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5 text-base text-stone-800">
          <li>
            {metrics.redemptionsThisMonth === 1
              ? "1 premio este mes"
              : `${metrics.redemptionsThisMonth} premios este mes`}
          </li>
          <li>
            {goalTarget > 0
              ? `Meta semanal ${weekly.thisWeek}/${goalTarget}`
              : weekly.thisWeek > 0
                ? `${weekly.thisWeek} premios esta semana`
                : "Todavía no hay canjes esta semana"}
          </li>
          {readyCount > 0 ? (
            <li className="font-semibold text-stone-900">
              {readyCount === 1
                ? "1 listo para canjear"
                : `${readyCount} listos para canjear`}
            </li>
          ) : null}
        </ul>
      )}

      <div className="flex flex-col gap-2.5 pt-1">
        {empty ? (
          <>
            <a
              href={`/${slug}/dashboard/loyalty/qr`}
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
            >
              Mostrar el QR
            </a>
            <a
              href={`/${slug}/dashboard/loyalty`}
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-[var(--color-primary,#F97316)] px-4 text-base font-bold text-[var(--color-primary,#F97316)]"
            >
              Atender clientes
            </a>
          </>
        ) : (
          <>
            <a
              href={`/${slug}/dashboard/loyalty`}
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
            >
              Atender clientes
            </a>
            <a
              href={`/${slug}/dashboard/loyalty/numeros`}
              className="inline-flex min-h-[48px] items-center justify-center px-2 text-base font-semibold text-[var(--color-primary,#F97316)]"
            >
              Cómo va el programa
            </a>
          </>
        )}
      </div>
    </section>
  )
}
