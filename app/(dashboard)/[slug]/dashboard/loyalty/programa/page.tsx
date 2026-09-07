import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import ProgramForm from "@/modules/loyalty/dashboard/program-form"
import { validateSession } from "@/shell/auth/session"
import { ModuleAccessGate } from "@/shell/billing/module-access-gate"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoyaltyProgramPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)

  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value
  if (!token) redirect(`/${slug}/login`)

  const session = await validateSession(token)
  if (!session || !business || session.businessId !== business.id) {
    redirect(`/${slug}/login`)
  }

  if (session.role !== "owner") {
    redirect(`/${slug}/dashboard/loyalty`)
  }

  return (
    <ModuleAccessGate business={business} moduleId="loyalty" audience="owner">
      <ProgramForm
        slug={slug}
        initialNeeded={business.points_needed}
        initialRanges={business.point_ranges ?? []}
        initialReward={business.reward_name}
      />
    </ModuleAccessGate>
  )
}
