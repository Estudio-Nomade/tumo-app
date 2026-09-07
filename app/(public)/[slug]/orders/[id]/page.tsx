import OrderConfirmation from "@/modules/orders/public/order-confirmation"
import { ModuleAccessGate } from "@/shell/billing/module-access-gate"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string; id: string }>
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { slug, id } = await params
  const business = await getBusiness(slug)

  return (
    <ModuleAccessGate business={business} moduleId="orders" audience="public">
      <OrderConfirmation slug={slug} orderId={id} />
    </ModuleAccessGate>
  )
}
