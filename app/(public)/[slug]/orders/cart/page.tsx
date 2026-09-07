import CartWizard from "@/modules/orders/public/cart"
import { ModuleAccessGate } from "@/shell/billing/module-access-gate"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function OrdersCartPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)

  return (
    <ModuleAccessGate business={business} moduleId="orders" audience="public">
      <CartWizard slug={slug} />
    </ModuleAccessGate>
  )
}
