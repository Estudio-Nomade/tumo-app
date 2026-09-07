import { notFound } from "next/navigation"
import Catalog from "@/modules/orders/public/catalog"
import { hasModuleAccess } from "@/shell/billing/access"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function OrdersPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)
  if (!business || !hasModuleAccess(business, "orders")) notFound()

  return <Catalog slug={slug} />
}
