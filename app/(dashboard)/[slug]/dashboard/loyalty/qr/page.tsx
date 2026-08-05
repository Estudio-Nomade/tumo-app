import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import LoyaltyQrView from "@/modules/loyalty/dashboard/loyalty-qr-view"
import { validateSession } from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoyaltyQrPage({ params }: PageProps) {
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

  return (
    <LoyaltyQrView business={business} role={session.role} slug={slug} />
  )
}
