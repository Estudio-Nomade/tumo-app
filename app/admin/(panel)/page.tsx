import Link from "next/link"
import { getAdminMetrics, listBusinesses } from "@/modules/admin/api/businesses"
import { BusinessesTable } from "@/modules/admin/dashboard/businesses-table"
import { MetricsCards } from "@/modules/admin/dashboard/metrics-cards"
import { adminBusinessesDeps } from "@/modules/admin/lib/default-deps"
import type { BillingStatus } from "@/modules/admin/lib/types"

export default async function AdminHomePage() {
  const [metricsRes, listRes] = await Promise.all([
    getAdminMetrics(adminBusinessesDeps),
    listBusinesses(adminBusinessesDeps),
  ])

  const metrics =
    metricsRes.status === 200
      ? (metricsRes.body as {
          business_count: number
          module_counts: Record<string, number>
          billing: { vencidos: number; al_dia: number; pendiente: number }
        })
      : {
          business_count: 0,
          module_counts: {},
          billing: { vencidos: 0, al_dia: 0, pendiente: 0 },
        }

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Panel interno</h1>
          <p className="text-sm text-slate-500">
            Todos los negocios conectados a Tumo.
          </p>
        </div>
        <Link
          href="/admin/businesses"
          className="text-sm font-semibold text-slate-900 underline-offset-2 hover:underline"
        >
          Ver listado completo
        </Link>
      </div>
      <MetricsCards metrics={metrics} />
      <BusinessesTable rows={businesses.slice(0, 10)} />
    </div>
  )
}
