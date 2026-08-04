import { getCustomer } from "@/modules/loyalty/api/customers"
import { customerDeps } from "@/modules/loyalty/lib/default-deps"
import { getClientCookie } from "@/modules/loyalty/lib/client-cookie"
import LoyaltyRegistration from "@/modules/loyalty/public/registration"
import type { LoyaltyCardData } from "@/modules/loyalty/public/card"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function PublicLoyaltyPage({ params }: PageProps) {
  const { slug } = await params
  const clientId = await getClientCookie()

  let initial: LoyaltyCardData | null = null
  if (clientId) {
    const result = await getCustomer(customerDeps, { id: clientId, slug })
    if (result.status === 200) {
      initial = result.body as unknown as LoyaltyCardData
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <LoyaltyRegistration initialCustomer={initial} />
    </div>
  )
}
