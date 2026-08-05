import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getActiveModules } from "@/lib/modules"
import DashboardHome from "@/shell/dashboard/dashboard-home"
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

  const modules = getActiveModules(business)

  return (
    <DashboardHome employeeName={session.name}>
      {modules.map((mod) => {
        const Section = mod.HomeSection
        if (!Section) return null
        return (
          <Section key={mod.id} slug={slug} business={business} />
        )
      })}
      {modules.every((m) => !m.HomeSection) ? (
        <p className="rounded-2xl border border-[#E7E5E4] bg-[#F5F5F4] px-4 py-8 text-center text-sm text-stone-500">
          No hay módulos activos con panel todavía.
        </p>
      ) : null}
    </DashboardHome>
  )
}
