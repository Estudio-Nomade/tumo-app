import { notFound } from "next/navigation"
import CartWizard from "@/modules/orders/public/cart"
import { hasModuleAccess } from "@/shell/billing/access"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function OrdersCartPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)
  if (!business || !hasModuleAccess(business, "orders")) notFound()

  return <CartWizard slug={slug} />
}
