import { listBusinesses } from "@/modules/admin/api/businesses"
import { BusinessesTable } from "@/modules/admin/dashboard/businesses-table"
import { adminBusinessesDeps } from "@/modules/admin/lib/default-deps"
import type { BillingStatus } from "@/modules/admin/lib/types"

export default async function AdminBusinessesPage() {
  const listRes = await listBusinesses(adminBusinessesDeps)
  const businesses =
    listRes.status === 200
      ? (
          listRes.body.businesses as {
            id: string
            name: string
            slug: string
            active_modules: string[]
            created_at: string | null
            billing: {
              status: BillingStatus
              monthly_amount_cents: number
            }
          }[]
        )
      : []

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Negocios</h1>
      <BusinessesTable rows={businesses} />
    </div>
  )
}
