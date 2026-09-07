import { notFound } from "next/navigation"
import BookingConfirmation from "@/modules/turnos/public/confirmation"
import { evaluateModuleAccess } from "@/shell/billing/access"
import { SubscriptionExpiredNotice } from "@/shell/billing/subscription-expired-notice"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string; id: string }>
}

export default async function TurnosConfirmationPage({ params }: PageProps) {
  const { slug, id } = await params
  const business = await getBusiness(slug)
  if (!business) notFound()

  const access = evaluateModuleAccess(business, "turnos")
  if (!access.ok) {
    if (access.reason === "billing_overdue") {
      return (
        <SubscriptionExpiredNotice
          business={business}
          moduleId="turnos"
          audience="public"
        />
      )
    }
    notFound()
  }

  return (
    <BookingConfirmation
      slug={slug}
      bookingId={id}
      businessName={business.name}
    />
  )
}
