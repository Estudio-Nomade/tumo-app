import type { ActivityEvent } from "@/lib/modules"
import MetricCard from "@/shell/ui/MetricCard"

function formatEventTime(timestamp: number) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ""

  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  const time = date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  if (sameDay) return time

  const day = date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  })
  return `${day} ${time}`
}

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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <MetricCard value={customers} label="Clientes" />
      <MetricCard value={purchasesThisMonth} label="Compras del mes" />
      <MetricCard value={redemptionsThisMonth} label="Premios canjeados" />
    </div>
  )
}

export function LoyaltyTimeline({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-xl bg-stone-100 px-6 py-10 text-center">
        <p className="max-w-sm text-sm leading-relaxed text-stone-500">
          Aún no hay actividad. Cuando tus clientes empiecen a escanear el QR,
          vas a ver todo el movimiento acá.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {events.map((event, index) => {
        const timeLabel = formatEventTime(event.timestamp)
        const iso = Number.isFinite(event.timestamp)
          ? new Date(event.timestamp).toISOString()
          : undefined

        return (
          <li
            key={`${event.timestamp}-${event.title}-${event.description}-${index}`}
            className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-3 shadow-sm"
          >
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary,#F97316)_12%,white)] text-lg"
            >
              {event.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-sm font-semibold text-stone-900"
                title={event.title}
              >
                {event.title}
              </div>
              <div
                className="truncate text-sm text-stone-600"
                title={event.description}
              >
                {event.description}
              </div>
            </div>
            {timeLabel ? (
              <time
                dateTime={iso}
                className="shrink-0 text-xs font-semibold tabular-nums text-stone-400"
              >
                {timeLabel}
              </time>
            ) : null}
          </li>
        )
      })}
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Dashboard
        </h1>
        <p className="text-sm text-stone-500">Así va tu comercio hoy.</p>
      </header>
      <LoyaltyMetrics {...metrics} />
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-stone-900">
          Actividad reciente
        </h2>
        <LoyaltyTimeline events={activity} />
      </section>
    </div>
  )
}
