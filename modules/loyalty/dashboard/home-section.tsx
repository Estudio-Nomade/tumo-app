import {
  getMetrics,
  getTopCustomers,
  getWeeklyRedemptions,
} from "@/modules/loyalty/api/metrics"
import { metricsDeps } from "@/modules/loyalty/lib/default-deps"
import {
  GoalCard,
  LoyaltyHomeQuickActions,
  LoyaltyMetrics,
  TopCustomers,
} from "@/modules/loyalty/dashboard/widgets"
import type { Business } from "@/lib/modules"

export async function LoyaltyHomeSection({
  slug,
  business,
}: {
  slug: string
  business: Business
}) {
  const [metrics, topCustomers, weeklyGoal] = await Promise.all([
    getMetrics(metricsDeps, { businessId: business.id }),
    getTopCustomers(metricsDeps, {
      businessId: business.id,
      purchasesNeeded: business.purchases_needed,
      rewardName: business.reward_name,
      limit: 3,
    }),
    getWeeklyRedemptions(metricsDeps, { businessId: business.id }),
  ])

  const goalTarget =
    weeklyGoal.lastWeek > 0
      ? weeklyGoal.lastWeek
      : weeklyGoal.thisWeek > 0
        ? weeklyGoal.thisWeek
        : 0

  return (
    <section className="flex flex-col gap-[18px]">
      <h2 className="text-sm font-semibold text-stone-900">Fidelización</h2>
      <LoyaltyHomeQuickActions slug={slug} />
      <LoyaltyMetrics {...metrics} />
      <GoalCard current={weeklyGoal.thisWeek} target={goalTarget} />
      <TopCustomers customers={topCustomers} slug={slug} />
    </section>
  )
}
