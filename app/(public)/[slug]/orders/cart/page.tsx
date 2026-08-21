import { notFound } from "next/navigation"
import { getBusiness } from "@/shell/db/business"
import CartWizard from "@/modules/orders/public/cart"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function OrdersCartPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)
  if (!business || !business.active_modules.includes("orders")) notFound()

  return <CartWizard slug={slug} />
}
