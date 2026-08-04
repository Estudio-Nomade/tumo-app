import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { getActiveModules } from "@/lib/modules"
import { validateSession } from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"
import DashboardLayout from "@/shell/layouts/dashboard-layout"

type LayoutProps = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function Layout({ children, params }: LayoutProps) {
  const { slug } = await params
  const business = await getBusiness(slug)

  if (!business) notFound()

  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value
  if (!token) {
    redirect(`/${slug}/login`)
  }

  const session = await validateSession(token)
  if (!session || session.businessId !== business.id) {
    redirect(`/${slug}/login`)
  }

  const allModules = getActiveModules(business)
  const sidebarModules = allModules.map((m) => ({ id: m.id, name: m.name, icon: m.icon }))

  return (
    <DashboardLayout business={business} role={session.role} modules={sidebarModules}>
      {children}
    </DashboardLayout>
  )
}
