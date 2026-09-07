import { notFound } from "next/navigation"
import BookingWizard from "@/modules/turnos/public/booking-wizard"
import { evaluateModuleAccess } from "@/shell/billing/access"
import { SubscriptionExpiredNotice } from "@/shell/billing/subscription-expired-notice"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function TurnosReservarPage({ params }: PageProps) {
  const { slug } = await params
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
    <BookingWizard
      slug={slug}
      businessId={business.id}
      businessName={business.name}
    />
  )
}
