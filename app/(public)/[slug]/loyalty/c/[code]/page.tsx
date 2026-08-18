import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { getCustomer } from "@/modules/loyalty/api/customers"
import { customerDeps } from "@/modules/loyalty/lib/default-deps"
import LoyaltyCard, {
  type LoyaltyCardData,
} from "@/modules/loyalty/public/card"
import { validateSession } from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string; code: string }>
}

export default async function CustomerLoyaltyDeepLinkPage({
  params,
}: PageProps) {
  const { slug, code } = await params
  const business = await getBusiness(slug)
  if (!business) notFound()

  const digits = code.replace(/\D/g, "").slice(0, 4)
  if (digits.length !== 4) notFound()

  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value
  if (token) {
    const session = await validateSession(token)
    if (session && session.businessId === business.id) {
      redirect(`/${slug}/dashboard/loyalty?c=${digits}`)
    }
  }

  const result = await getCustomer(customerDeps, { code: digits, slug })
  if (result.status !== 200) notFound()

  const customer = result.body as unknown as LoyaltyCardData

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoyaltyCard customer={customer} slug={slug} />
    </div>
  )
}
