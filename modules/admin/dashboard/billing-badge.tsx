import type { BillingStatus } from "@/modules/admin/lib/types"

const STYLES: Record<BillingStatus, string> = {
  al_dia: "bg-emerald-100 text-emerald-800",
  pendiente: "bg-amber-100 text-amber-900",
  vencido: "bg-red-100 text-red-800",
}

const LABELS: Record<BillingStatus, string> = {
  al_dia: "Al día",
  pendiente: "Pendiente",
  vencido: "Vencido",
}

export function BillingBadge({ status }: { status: BillingStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status] ?? STYLES.pendiente}`}
    >
      {LABELS[status] ?? status}
    </span>
  )
}

export function ModuleBadge({ id }: { id: string }) {
  return (
    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      {id}
    </span>
  )
}
