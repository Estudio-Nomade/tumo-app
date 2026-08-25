import { Suspense } from "react"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import ProductsManager from "@/modules/orders/dashboard/products-manager"
import { validateSession } from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function DashboardOrdersProductsPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getBusiness(slug)
  if (!business) notFound()

  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value
  if (!token) redirect(`/${slug}/login`)

  const session = await validateSession(token)
  if (!session || session.businessId !== business.id) {
    redirect(`/${slug}/login`)
  }

  return (
    <div className="p-2">
      <Suspense
        fallback={
          <div className="flex min-h-[180px] items-center justify-center text-base text-stone-600">
            Cargando…
          </div>
        }
      >
        <ProductsManager slug={slug} />
      </Suspense>
    </div>
  )
}
