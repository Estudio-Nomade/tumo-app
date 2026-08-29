import { notFound } from "next/navigation"
import BookingConfirmation from "@/modules/turnos/public/confirmation"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string; id: string }>
}

export default async function TurnosConfirmationPage({ params }: PageProps) {
  const { slug, id } = await params
  const business = await getBusiness(slug)
  if (!business || !business.active_modules.includes("turnos")) notFound()

  return (
    <BookingConfirmation
      slug={slug}
      bookingId={id}
      businessName={business.name}
    />
  )
}
