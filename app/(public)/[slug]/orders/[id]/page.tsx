import { notFound } from "next/navigation"
import { getBusiness } from "@/shell/db/business"
import OrderConfirmation from "@/modules/orders/public/order-confirmation"

type PageProps = {
  params: Promise<{ slug: string; id: string }>
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { slug, id } = await params
  const business = await getBusiness(slug)
  if (!business || !business.active_modules.includes("orders")) notFound()

  return <OrderConfirmation slug={slug} orderId={id} />
}
