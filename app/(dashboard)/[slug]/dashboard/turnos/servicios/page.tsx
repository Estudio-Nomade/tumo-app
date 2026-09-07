import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import ServicesManager from "@/modules/turnos/dashboard/services-manager"
import { validateSession } from "@/shell/auth/session"
import { ModuleAccessGate } from "@/shell/billing/module-access-gate"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function TurnosServiciosPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)

  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value
  if (!token) redirect(`/${slug}/login`)
  const session = await validateSession(token)
  if (!session || !business || session.businessId !== business.id) {
    redirect(`/${slug}/login`)
  }

  return (
    <ModuleAccessGate business={business} moduleId="turnos" audience="owner">
      <div className="p-2">
        <ServicesManager slug={slug} />
      </div>
    </ModuleAccessGate>
  )
}
