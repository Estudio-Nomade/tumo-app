import type { Business } from "@/lib/modules"
import { getMetrics } from "@/modules/orders/api/metrics"
import { metricsDeps } from "@/modules/orders/lib/default-deps"
import { OrdersMetrics } from "@/modules/orders/dashboard/widgets"

export async function OrdersHomeSection({
  slug,
  business,
}: {
  slug: string
  business: Business
}) {
  const result = await getMetrics(metricsDeps, { businessId: business.id })
  if (result.status !== 200) return null

  const metrics = result.body as {
    ordersToday: number
    revenueTodayCents: number
    receiptsToReview: number
  }

  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-[#E7E5E4] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-stone-900">Pedidos</h2>
        <a
          href={`/${slug}/dashboard/orders`}
          className="inline-flex min-h-[48px] items-center text-base font-semibold text-[var(--color-primary,#F97316)]"
        >
          Ver panel
        </a>
      </div>
      <OrdersMetrics slug={slug} {...metrics} />
    </section>
  )
}
