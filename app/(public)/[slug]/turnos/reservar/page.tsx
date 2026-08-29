import { notFound } from "next/navigation"
import BookingWizard from "@/modules/turnos/public/booking-wizard"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function TurnosReservarPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)
  if (!business || !business.active_modules.includes("turnos")) notFound()

  return (
    <BookingWizard
      slug={slug}
      businessId={business.id}
      businessName={business.name}
    />
  )
}
