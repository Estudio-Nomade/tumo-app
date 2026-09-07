import { notFound } from "next/navigation"
import TurnosEntry from "@/modules/turnos/public/entry"
import { getSettings } from "@/modules/turnos/api/settings"
import { settingsDeps } from "@/modules/turnos/lib/default-deps"
import { evaluateModuleAccess } from "@/shell/billing/access"
import { SubscriptionExpiredNotice } from "@/shell/billing/subscription-expired-notice"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function TurnosPublicPage({ params }: PageProps) {
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

  const settingsRes = await getSettings(settingsDeps, {
    businessId: business.id,
  })
  const isPaused = Boolean(
    (settingsRes.body as { settings?: { isPaused?: boolean } }).settings
      ?.isPaused
  )

  return (
    <TurnosEntry
      slug={slug}
      businessName={business.name}
      isPaused={isPaused}
    />
  )
}
