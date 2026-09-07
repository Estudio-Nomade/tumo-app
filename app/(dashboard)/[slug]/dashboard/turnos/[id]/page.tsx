import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import BookingDetail from "@/modules/turnos/dashboard/booking-detail"
import { validateSession } from "@/shell/auth/session"
import { hasModuleAccess } from "@/shell/billing/access"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string; id: string }>
}

export default async function TurnosDetailPage({ params }: PageProps) {
  const { slug, id } = await params
  const business = await getBusiness(slug)
  if (!business || !hasModuleAccess(business, "turnos")) notFound()

  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value
  if (!token) redirect(`/${slug}/login`)
  const session = await validateSession(token)
  if (!session || session.businessId !== business.id) {
    redirect(`/${slug}/login`)
  }

  return <BookingDetail slug={slug} bookingId={id} />
}
