import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import { getBusiness } from "@/shell/db/business"
import PublicLayout from "@/shell/layouts/public-layout"

type LayoutProps = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function Layout({ children, params }: LayoutProps) {
  const { slug } = await params
  const business = await getBusiness(slug)

  if (!business) notFound()

  return <PublicLayout business={business}>{children}</PublicLayout>
}
