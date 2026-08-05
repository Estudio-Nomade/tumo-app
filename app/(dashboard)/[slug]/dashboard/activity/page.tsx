import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  collectRecentActivity,
  getActiveModules,
} from "@/lib/modules"
import { ActivityPage } from "@/modules/loyalty/dashboard/widgets"
import { validateSession } from "@/shell/auth/session"
import { getBusinessById } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function DashboardActivityPage({ params }: PageProps) {
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

  const modules = getActiveModules(business)
  const activity = await collectRecentActivity(
    modules,
    session.businessId,
    30
  )

  return <ActivityPage events={activity} />
}
