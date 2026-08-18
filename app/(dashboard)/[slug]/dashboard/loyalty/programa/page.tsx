import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { validateSession } from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"
import ProgramForm from "@/modules/loyalty/dashboard/program-form"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoyaltyProgramPage({ params }: PageProps) {
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

  if (session.role !== "owner") {
    redirect(`/${slug}/dashboard/loyalty`)
  }

  return (
    <ProgramForm
      slug={slug}
      initialNeeded={business.points_needed}
      initialRanges={business.point_ranges ?? []}
      initialReward={business.reward_name}
    />
  )
}
