export type AdminMetrics = {
  business_count: number
  module_counts: Record<string, number>
  billing: { vencidos: number; al_dia: number; pendiente: number }
}

export function MetricsCards({ metrics }: { metrics: AdminMetrics }) {
  const cards = [
    {
      label: "Negocios",
      value: metrics.business_count,
    },
    {
      label: "Billing vencidos",
      value: metrics.billing.vencidos,
    },
    {
      label: "Al día",
      value: metrics.billing.al_dia,
    },
    ...Object.entries(metrics.module_counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, count]) => ({
        label: `Módulo ${id}`,
        value: count,
      })),
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="text-2xl font-bold tabular-nums text-slate-900">
            {c.value}
          </div>
          <div className="mt-1 text-sm text-slate-500">{c.label}</div>
        </div>
      ))}
    </div>
  )
}
