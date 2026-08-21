import { notFound } from "next/navigation"
import { getBusiness } from "@/shell/db/business"
import Catalog from "@/modules/orders/public/catalog"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function OrdersPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)
  if (!business || !business.active_modules.includes("orders")) notFound()

  return <Catalog slug={slug} />
}
