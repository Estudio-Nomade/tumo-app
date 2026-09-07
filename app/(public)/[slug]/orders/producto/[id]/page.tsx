import ProductDetail from "@/modules/orders/public/product-detail"
import { ModuleAccessGate } from "@/shell/billing/module-access-gate"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string; id: string }>
}

export default async function OrdersProductDetailPage({ params }: PageProps) {
  const { slug, id } = await params
  const business = await getBusiness(slug)

  return (
    <ModuleAccessGate business={business} moduleId="orders" audience="public">
      <ProductDetail slug={slug} productId={id} />
    </ModuleAccessGate>
  )
}
