import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  getMetrics,
  getTopCustomers,
  getWeeklyRedemptions,
} from "@/modules/loyalty/api/metrics"
import { metricsDeps } from "@/modules/loyalty/lib/default-deps"
import { DashboardHome } from "@/modules/loyalty/dashboard/widgets"
import { validateSession } from "@/shell/auth/session"
import { getBusinessById } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function DashboardHomePage({ params }: PageProps) {
  const { slug } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value
  if (!token) redirect(`/${slug}/login`)

  const session = await validateSession(token)
  if (!session) redirect(`/${slug}/login`)

  if (session.role !== "owner") {
    redirect(`/${slug}/dashboard/loyalty`)
  }

  const business = await getBusinessById(session.businessId)
  if (!business) redirect(`/${slug}/login`)

  const [metrics, topCustomers, weeklyGoal] = await Promise.all([
    getMetrics(metricsDeps, { businessId: session.businessId }),
    getTopCustomers(metricsDeps, {
      businessId: session.businessId,
      purchasesNeeded: business.purchases_needed,
      rewardName: business.reward_name,
      limit: 3,
    }),
    getWeeklyRedemptions(metricsDeps, { businessId: session.businessId }),
  ])

  return (
    <DashboardHome
      metrics={metrics}
      employeeName={session.name}
      topCustomers={topCustomers}
      weeklyGoal={weeklyGoal}
    />
  )
}
