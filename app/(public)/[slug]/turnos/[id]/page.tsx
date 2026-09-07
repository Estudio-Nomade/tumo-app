import { notFound } from "next/navigation"
import BookingConfirmation from "@/modules/turnos/public/confirmation"
import { hasModuleAccess } from "@/shell/billing/access"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string; id: string }>
}

export default async function TurnosConfirmationPage({ params }: PageProps) {
  const { slug, id } = await params
  const business = await getBusiness(slug)
  if (!business || !hasModuleAccess(business, "turnos")) notFound()

  return (
    <BookingConfirmation
      slug={slug}
      bookingId={id}
      businessName={business.name}
    />
  )
}
