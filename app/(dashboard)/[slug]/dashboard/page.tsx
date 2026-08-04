import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  getMetrics,
  getRecentActivity,
} from "@/modules/loyalty/api/metrics"
import { metricsDeps } from "@/modules/loyalty/lib/default-deps"
import { DashboardHome } from "@/modules/loyalty/dashboard/widgets"
import { validateSession } from "@/shell/auth/session"

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

  const [metrics, activity] = await Promise.all([
    getMetrics(metricsDeps, { businessId: session.businessId }),
    getRecentActivity(metricsDeps, {
      businessId: session.businessId,
      limit: 15,
    }),
  ])

  return <DashboardHome metrics={metrics} activity={activity} />
}
