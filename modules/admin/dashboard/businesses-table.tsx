import Link from "next/link"
import {
  BillingBadge,
  ModuleBadge,
} from "@/modules/admin/dashboard/billing-badge"
import type { BillingStatus } from "@/modules/admin/lib/types"

export type AdminBusinessRow = {
  id: string
  name: string
  slug: string
  active_modules: string[]
  created_at: string | null
  billing: {
    status: BillingStatus
    monthly_amount_cents: number
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("es-AR")
  } catch {
    return iso
  }
}

export function BusinessesTable({ rows }: { rows: AdminBusinessRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
        No hay negocios conectados.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Negocio</th>
            <th className="px-4 py-3 font-semibold">Módulos</th>
            <th className="px-4 py-3 font-semibold">Alta</th>
            <th className="px-4 py-3 font-semibold">Billing</th>
            <th className="px-4 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80"
            >
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{row.name}</div>
                <div className="text-xs text-slate-500">/{row.slug}</div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {(row.active_modules ?? []).map((id) => (
                    <ModuleBadge key={id} id={id} />
                  ))}
                  {(row.active_modules ?? []).length === 0 ? (
                    <span className="text-xs text-slate-400">ninguno</span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {formatDate(row.created_at)}
              </td>
              <td className="px-4 py-3">
                <BillingBadge status={row.billing.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/businesses/${row.id}`}
                  className="text-sm font-semibold text-slate-900 underline-offset-2 hover:underline"
                >
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
