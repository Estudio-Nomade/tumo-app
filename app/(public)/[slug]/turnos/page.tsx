import { notFound } from "next/navigation"
import TurnosEntry from "@/modules/turnos/public/entry"
import { getSettings } from "@/modules/turnos/api/settings"
import { settingsDeps } from "@/modules/turnos/lib/default-deps"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function TurnosPublicPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)
  if (!business || !business.active_modules.includes("turnos")) notFound()

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
