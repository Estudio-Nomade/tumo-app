import Link from "next/link"
import { notFound } from "next/navigation"
import { getBusinessAdmin } from "@/modules/admin/api/businesses"
import {
  BusinessDetailClient,
  type BusinessDetailData,
} from "@/modules/admin/dashboard/business-detail"
import { adminBusinessesDeps } from "@/modules/admin/lib/default-deps"
import { getRegisteredModuleIds } from "@/lib/modules"

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getBusinessAdmin(adminBusinessesDeps, {
    businessId: id,
  })
  if (result.status === 404) notFound()
  if (result.status !== 200) {
    return (
      <p className="text-sm text-red-600">
        {(result.body.error as string) ?? "Error al cargar negocio."}
      </p>
    )
  }

  const business = result.body.business as BusinessDetailData

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin/businesses"
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← Negocios
      </Link>
      <BusinessDetailClient
        business={business}
        registeredModules={getRegisteredModuleIds()}
      />
    </div>
  )
}
