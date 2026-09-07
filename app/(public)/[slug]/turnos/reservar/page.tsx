import { notFound } from "next/navigation"
import BookingWizard from "@/modules/turnos/public/booking-wizard"
import { hasModuleAccess } from "@/shell/billing/access"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function TurnosReservarPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)
  if (!business || !hasModuleAccess(business, "turnos")) notFound()

  return (
    <BookingWizard
      slug={slug}
      businessId={business.id}
      businessName={business.name}
    />
  )
}
