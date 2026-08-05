import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { validateSession } from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"
import SettingsForm from "@/shell/ui/settings-form"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function DashboardSettingsPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)
  if (!business) notFound()

  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value
  if (!token) redirect(`/${slug}/login`)

  const session = await validateSession(token)
  if (!session || session.businessId !== business.id) {
    redirect(`/${slug}/login`)
  }

  if (session.role !== "owner") {
    redirect(`/${slug}/dashboard/loyalty`)
  }

  const ownerName = session.name?.trim() || "Dueño"
  const ownerInitial = (session.name?.trim()?.[0] ?? "U").toUpperCase()

  return (
    <SettingsForm
      slug={slug}
      initialName={business.name}
      initialLogo={business.logo}
      initialPrimary={business.primary_color}
      initialSecondary={business.secondary_color}
      rewardName={business.reward_name}
      purchasesNeeded={business.purchases_needed}
      activeModuleIds={business.active_modules}
      ownerName={ownerName}
      ownerInitial={ownerInitial}
    />
  )
}
