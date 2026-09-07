import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import TurnosSettingsForm from "@/modules/turnos/dashboard/settings-form"
import { validateSession } from "@/shell/auth/session"
import { ModuleAccessGate } from "@/shell/billing/module-access-gate"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function TurnosAjustesPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)

  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value
  if (!token) redirect(`/${slug}/login`)
  const session = await validateSession(token)
  if (!session || !business || session.businessId !== business.id) {
    redirect(`/${slug}/login`)
  }
  if (session.role !== "owner") {
    redirect(`/${slug}/dashboard/turnos`)
  }

  return (
    <ModuleAccessGate business={business} moduleId="turnos" audience="owner">
      <div className="p-2">
        <TurnosSettingsForm slug={slug} />
      </div>
    </ModuleAccessGate>
  )
}
