import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import BookingDetail from "@/modules/turnos/dashboard/booking-detail"
import { validateSession } from "@/shell/auth/session"
import { ModuleAccessGate } from "@/shell/billing/module-access-gate"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string; id: string }>
}

export default async function TurnosDetailPage({ params }: PageProps) {
  const { slug, id } = await params
  const business = await getBusiness(slug)

  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value
  if (!token) redirect(`/${slug}/login`)
  const session = await validateSession(token)
  if (!session || !business || session.businessId !== business.id) {
    redirect(`/${slug}/login`)
  }

  return (
    <ModuleAccessGate business={business} moduleId="turnos" audience="owner">
      <BookingDetail slug={slug} bookingId={id} />
    </ModuleAccessGate>
  )
}
