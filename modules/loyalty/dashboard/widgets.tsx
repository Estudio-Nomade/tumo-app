import type { ActivityEvent } from "@/lib/modules"
import type {
  TopCustomerByPrizesRow,
  TopCustomerRow,
} from "@/modules/loyalty/api/metrics"
import MetricCard from "@/shell/ui/MetricCard"
import { Gift, QrCode, Sandwich, ShoppingBag, Users } from "lucide-react"

function formatEventTime(timestamp: number) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function groupActivityByDay(events: ActivityEvent[]) {
  const now = new Date()
  const todayStart = startOfLocalDay(now)
  const yesterdayDate = new Date(now)
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterdayStart = startOfLocalDay(yesterdayDate)

  const groups: { label: string; events: ActivityEvent[] }[] = []
  const buckets = new Map<string, ActivityEvent[]>()
  const dayOrder: string[] = []

  for (const event of events) {
    if (!Number.isFinite(event.timestamp)) continue
    const dayStart = startOfLocalDay(new Date(event.timestamp))
    if (!Number.isFinite(dayStart)) continue

    let label: string
    if (dayStart === todayStart) label = "Hoy"
    else if (dayStart === yesterdayStart) label = "Ayer"
    else {
      label = new Date(event.timestamp).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    }
    if (!buckets.has(label)) {
      buckets.set(label, [])
      dayOrder.push(label)
    }
    buckets.get(label)!.push(event)
  }

  const preferred = ["Hoy", "Ayer"]
  for (const label of preferred) {
    const list = buckets.get(label)
    if (list?.length) groups.push({ label, events: list })
  }
  for (const label of dayOrder) {
    if (preferred.includes(label)) continue
    const list = buckets.get(label)
    if (list?.length) groups.push({ label, events: list })
  }
  return groups
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0][0]!.toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
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
    <div className="grid grid-cols-3 gap-2.5">
      <MetricCard
        value={customers}
        label="Clientes"
        icon={
          <Users
            size={18}
            className="text-[var(--color-primary,#F97316)]"
            strokeWidth={2}
          />
        }
      />
      <MetricCard
        value={purchasesThisMonth}
        label="Compras del mes"
        icon={
          <ShoppingBag
            size={18}
            className="text-[var(--color-primary,#F97316)]"
            strokeWidth={2}
          />
        }
      />
      <MetricCard
        value={redemptionsThisMonth}
        label="Premios canjeados"
        variant="highlight"
        icon={<Gift size={18} className="text-[#D97706]" strokeWidth={2} />}
      />
    </div>
  )
}

/** Quick actions for owner home (module-owned). */
export function LoyaltyHomeQuickActions({ slug }: { slug: string }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <a
        href={`/${slug}/dashboard/loyalty`}
        className="inline-flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-[var(--color-primary,#F97316)] px-3 py-3.5 text-center text-sm font-bold text-white shadow-sm"
      >
        <Users size={22} strokeWidth={2.25} aria-hidden />
        Atender clientes
      </a>
      <a
        href={`/${slug}/dashboard/loyalty/qr`}
        className="inline-flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-[var(--color-primary,#F97316)] bg-white px-3 py-3.5 text-center text-sm font-bold text-[var(--color-primary,#F97316)] shadow-sm"
      >
        <QrCode size={22} strokeWidth={2.25} aria-hidden />
        Mostrar QR
      </a>
    </div>
  )
}

export function GoalCard({
  current,
  target,
}: {
  current: number
  target: number
}) {
  const safeCurrent = Number.isFinite(current) ? Math.max(0, current) : 0
  const safeTarget = Number.isFinite(target) && target > 0 ? target : 0
  const pct =
    safeTarget > 0
      ? Math.min(100, Math.round((safeCurrent / safeTarget) * 100))
      : 0

  const remaining = Math.max(0, safeTarget - safeCurrent)
  const message =
    safeTarget === 0
      ? "Todavía no hay canjes esta semana."
      : safeCurrent >= safeTarget
        ? "¡Meta de la semana cumplida!"
        : remaining === 1
          ? "Te falta 1 canje para igualar la semana pasada."
          : `Te faltan ${remaining} canjes para igualar la semana pasada.`

  return (
    <section className="flex flex-col gap-3 rounded-[20px] bg-gradient-to-b from-[var(--color-primary,#F97316)] to-[var(--color-primary-deep,#EA580C)] p-[18px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-[#FFEDD5]">Meta de la semana</span>
        <span className="text-[13px] font-bold text-white">
          {safeCurrent} / {safeTarget || "—"} canjes
        </span>
      </div>
      {safeTarget > 0 ? (
        <div className="h-3 w-full overflow-hidden rounded-full bg-[#FFFFFF40]">
          <div
            className="h-full rounded-full bg-[var(--color-secondary,#FACC15)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
      <p className="text-xs text-[#FFEDD5]">{message}</p>
    </section>
  )
}

export function TopCustomers({
  customers,
  slug,
}: {
  customers: TopCustomerRow[]
  slug: string
}) {
  if (customers.length === 0) {
    return (
      <section className="flex flex-col gap-2.5">
        <h2 className="text-sm font-semibold text-stone-900">
          Más cerca del premio
        </h2>
        <div className="rounded-2xl border border-[#E7E5E4] bg-[#F5F5F4] px-4 py-8 text-center text-sm text-stone-500">
          Compartí el QR del programa para conseguir tu primer cliente.
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-900">
          Más cerca del premio
        </h2>
        <a
          href={`/${slug}/dashboard/loyalty`}
          className="text-xs font-semibold text-[var(--color-primary,#F97316)]"
        >
          Ver todos
        </a>
      </div>
      <ul className="flex flex-col gap-2.5">
        {customers.map((c) => (
          <li key={c.id}>
            <a
              href={`/${slug}/dashboard/loyalty?highlight=${encodeURIComponent(c.id)}`}
              className="flex items-center gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-3 transition hover:border-[var(--color-primary,#F97316)]/40"
            >
              <div
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF7ED] text-xs font-bold text-[var(--color-primary,#F97316)]"
              >
                {initialsOf(c.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-stone-900">
                  {c.name}
                </div>
                <div className="truncate text-xs text-stone-500">
                  {c.canRedeem
                    ? "Premio listo para canjear"
                    : `${c.purchases}/${c.purchasesNeeded} compras`}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  c.canRedeem
                    ? "bg-[#FEF9C3] text-[#A16207]"
                    : "bg-[#DCFCE7] text-[#16A34A]"
                }`}
              >
                {c.canRedeem ? "Listo" : "En curso"}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function TopByPrizesList({
  customers,
  redeemersCount,
  slug,
}: {
  customers: TopCustomerByPrizesRow[]
  redeemersCount: number
  slug: string
}) {
  const count = Number.isFinite(redeemersCount)
    ? Math.max(0, Math.floor(redeemersCount))
    : 0

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-900">
          Más premios ganados
        </h2>
        <span className="text-xs font-medium text-stone-500">
          {count === 1 ? "1 cliente canjeó" : `${count} clientes canjearon`}
        </span>
      </div>
      {customers.length === 0 ? (
        <div className="rounded-2xl border border-[#E7E5E4] bg-[#F5F5F4] px-4 py-8 text-center text-sm text-stone-500">
          Todavía nadie canjeó un premio.
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {customers.map((c) => (
            <li key={c.id}>
              <a
                href={`/${slug}/dashboard/loyalty?highlight=${encodeURIComponent(c.id)}`}
                className="flex items-center gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-3 transition hover:border-[var(--color-primary,#F97316)]/40"
              >
                <div
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF7ED] text-xs font-bold text-[var(--color-primary,#F97316)]"
                >
                  {initialsOf(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-stone-900">
                    {c.name}
                  </div>
                  <div className="truncate text-xs text-stone-500">
                    {c.prizes === 1 ? "1 premio" : `${c.prizes} premios`}
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ActivityEventIcon({ kind }: { kind: string }) {
  if (kind === "redemption") {
    return (
      <span
        aria-hidden
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7]"
      >
        <Gift size={18} className="text-[#D97706]" strokeWidth={2} />
      </span>
    )
  }
  return (
    <span
      aria-hidden
      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-[#FFF7ED]"
    >
      <Sandwich
        size={18}
        className="text-[var(--color-primary,#F97316)]"
        strokeWidth={2}
      />
    </span>
  )
}

export function LoyaltyTimeline({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-[#E7E5E4] bg-[#F5F5F4] px-6 py-10 text-center">
        <p className="max-w-sm text-sm leading-relaxed text-stone-500">
          Aún no hay actividad. Cuando tus clientes empiecen a escanear el QR,
          vas a ver todo el movimiento acá.
        </p>
      </div>
    )
  }

  const groups = groupActivityByDay(events)

  return (
    <div className="flex flex-col gap-2.5">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-2.5">
          <h3 className="text-sm font-bold text-stone-900">{group.label}</h3>
          <ul className="flex flex-col gap-2.5">
            {group.events.map((event, index) => {
              const timeLabel = formatEventTime(event.timestamp)
              const iso = Number.isFinite(event.timestamp)
                ? new Date(event.timestamp).toISOString()
                : undefined

              return (
                <li
                  key={`${event.timestamp}-${event.title}-${event.description}-${index}`}
                  className="flex items-center gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-3"
                >
                  {timeLabel ? (
                    <time
                      dateTime={iso}
                      className="w-11 shrink-0 text-xs font-semibold tabular-nums text-[#A8A29E]"
                    >
                      {timeLabel}
                    </time>
                  ) : null}
                  <ActivityEventIcon kind={event.icon} />
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-sm font-semibold text-stone-900"
                      title={event.title}
                    >
                      {event.title}
                    </div>
                    <div
                      className="truncate text-xs text-stone-500"
                      title={event.description}
                    >
                      {event.description}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function ActivityPage({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[18px]">
      <header className="flex flex-col gap-0.5">
        <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
          Actividad
        </h1>
        <p className="text-[13px] text-stone-500">
          Últimos movimientos de tu comercio
        </p>
      </header>
      <LoyaltyTimeline events={events} />
    </div>
  )
}
