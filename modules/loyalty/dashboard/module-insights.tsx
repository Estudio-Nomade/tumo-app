import {
  countCustomersWithRedemptions,
  getMetrics,
  getTopCustomers,
  getTopCustomersByPrizes,
  getWeeklyRedemptions,
} from "@/modules/loyalty/api/metrics"
import { metricsDeps } from "@/modules/loyalty/lib/default-deps"
import {
  GoalCard,
  LoyaltyMetrics,
  TopByPrizesList,
  TopCustomers,
} from "@/modules/loyalty/dashboard/widgets"
import type { Business } from "@/lib/modules"

export async function LoyaltyModuleInsights({
  slug,
  business,
}: {
  slug: string
  business: Business
}) {
  const [metrics, closest, byPrizes, redeemersCount, weeklyGoal] =
    await Promise.all([
      getMetrics(metricsDeps, { businessId: business.id }),
      getTopCustomers(metricsDeps, {
        businessId: business.id,
        purchasesNeeded: business.purchases_needed,
        rewardName: business.reward_name,
        limit: 3,
      }),
      getTopCustomersByPrizes(metricsDeps, {
        businessId: business.id,
        limit: 3,
      }),
      countCustomersWithRedemptions(metricsDeps, {
        businessId: business.id,
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
    <section className="mb-4 flex flex-col gap-[18px]">
      <LoyaltyMetrics {...metrics} />
      <GoalCard current={weeklyGoal.thisWeek} target={goalTarget} />
      <TopCustomers customers={closest} slug={slug} />
      <TopByPrizesList
        customers={byPrizes}
        redeemersCount={redeemersCount}
        slug={slug}
      />
    </section>
  )
}
