import { notFound } from "next/navigation"
import ProductDetail from "@/modules/orders/public/product-detail"
import { hasModuleAccess } from "@/shell/billing/access"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string; id: string }>
}

export default async function OrdersProductDetailPage({ params }: PageProps) {
  const { slug, id } = await params
  const business = await getBusiness(slug)
  if (!business || !hasModuleAccess(business, "orders")) notFound()

  return <ProductDetail slug={slug} productId={id} />
}
