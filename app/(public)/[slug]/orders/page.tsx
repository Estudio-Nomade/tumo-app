import Catalog from "@/modules/orders/public/catalog"
import { ModuleAccessGate } from "@/shell/billing/module-access-gate"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function OrdersPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)

  return (
    <ModuleAccessGate business={business} moduleId="orders" audience="public">
      <Catalog slug={slug} />
    </ModuleAccessGate>
  )
}
