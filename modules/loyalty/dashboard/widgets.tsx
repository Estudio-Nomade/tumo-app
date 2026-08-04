import type { ActivityEvent } from "@/lib/modules"
import MetricCard from "@/shell/ui/MetricCard"

export function LoyaltyMetrics({
  customers,
  purchasesThisMonth,
  redemptionsThisMonth,
}: {
  customers: number
  purchasesThisMonth: number
  redemptionsThisMonth: number
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <MetricCard value={customers} label="Clientes" />
      <MetricCard value={purchasesThisMonth} label="Compras del mes" />
      <MetricCard value={redemptionsThisMonth} label="Premios canjeados" />
    </div>
  )
}

export function LoyaltyTimeline({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500">Todavía no hay actividad reciente.</p>
    )
  }

  return (
    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      {events.map((event) => (
        <li
          key={`${event.timestamp}-${event.title}-${event.description}`}
          className="flex items-start gap-3 px-4 py-3"
        >
          <span className="text-xl" aria-hidden>
            {event.icon}
          </span>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {event.title}
            </div>
            <div className="text-sm text-gray-600">{event.description}</div>
            <div className="text-xs text-gray-400">
              {new Date(event.timestamp).toLocaleString("es-AR")}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function DashboardHome({
  metrics,
  activity,
}: {
  metrics: {
    customers: number
    purchasesThisMonth: number
    redemptionsThisMonth: number
  }
  activity: ActivityEvent[]
}) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <LoyaltyMetrics {...metrics} />
      <div>
        <h2 className="mb-3 text-lg font-semibold">Actividad reciente</h2>
        <LoyaltyTimeline events={activity} />
      </div>
    </div>
  )
}
