import { Suspense } from "react"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import LoyaltyPanel from "@/modules/loyalty/dashboard/panel"
import { LoyaltyModuleInsights } from "@/modules/loyalty/dashboard/module-insights"
import { validateSession } from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function DashboardLoyaltyPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)
  if (!business) notFound()

  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value
  if (!token) redirect(`/${slug}/login`)

  const session = await validateSession(token)
  if (!session || session.businessId !== business.id) {
    redirect(`/${slug}/login`)
  }

  const canEditProgram = session.role === "owner"

  return (
    <div className="p-2">
      <Suspense
        fallback={
          <div className="flex min-h-[180px] items-center justify-center text-sm text-stone-500">
            Cargando…
          </div>
        }
      >
        <LoyaltyPanel canEditProgram={canEditProgram} />
      </Suspense>
      <LoyaltyModuleInsights slug={slug} business={business} />
    </div>
  )
}
