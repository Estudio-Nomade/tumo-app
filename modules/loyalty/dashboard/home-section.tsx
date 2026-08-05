import { getMetrics, getTopBuyers } from "@/modules/loyalty/api/metrics"
import { metricsDeps } from "@/modules/loyalty/lib/default-deps"
import {
  FeaturedCustomers,
  HomeActivityMetrics,
} from "@/modules/loyalty/dashboard/widgets"
import type { Business } from "@/lib/modules"

export async function LoyaltyHomeSection({
  slug,
  business,
}: {
  slug: string
  business: Business
}) {
  const [metrics, featured] = await Promise.all([
    getMetrics(metricsDeps, { businessId: business.id }),
    getTopBuyers(metricsDeps, {
      businessId: business.id,
      limit: 3,
    }),
  ])

  return (
    <section className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-900">Fidelización</h2>
        <a
          href={`/${slug}/dashboard/loyalty`}
          className="text-xs font-semibold text-[var(--color-primary,#F97316)]"
        >
          Abrir Fidelización →
        </a>
      </div>
      <HomeActivityMetrics
        customers={metrics.customers}
        purchasesThisMonth={metrics.purchasesThisMonth}
      />
      <FeaturedCustomers customers={featured} slug={slug} />
    </section>
  )
}
