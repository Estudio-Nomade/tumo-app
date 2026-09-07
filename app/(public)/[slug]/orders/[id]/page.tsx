import { notFound } from "next/navigation"
import OrderConfirmation from "@/modules/orders/public/order-confirmation"
import { hasModuleAccess } from "@/shell/billing/access"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string; id: string }>
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { slug, id } = await params
  const business = await getBusiness(slug)
  if (!business || !hasModuleAccess(business, "orders")) notFound()

  return <OrderConfirmation slug={slug} orderId={id} />
}
