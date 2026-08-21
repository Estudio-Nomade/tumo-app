import { notFound } from "next/navigation"
import { getBusiness } from "@/shell/db/business"
import ProductDetail from "@/modules/orders/public/product-detail"

type PageProps = {
  params: Promise<{ slug: string; id: string }>
}

export default async function OrdersProductDetailPage({ params }: PageProps) {
  const { slug, id } = await params
  const business = await getBusiness(slug)
  if (!business || !business.active_modules.includes("orders")) notFound()

  return <ProductDetail slug={slug} productId={id} />
}
