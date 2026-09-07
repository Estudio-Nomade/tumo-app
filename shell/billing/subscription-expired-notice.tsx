import type { Business } from "@/lib/modules"

const MODULE_LABELS: Record<string, string> = {
  loyalty: "fidelización",
  orders: "pedidos",
  turnos: "turnos",
}

export function moduleAccessLabel(moduleId: string): string {
  return MODULE_LABELS[moduleId] ?? moduleId
}

/** Friendly pause screen when Tumo subscription is overdue (not a 404). */
export function SubscriptionExpiredNotice({
  business,
  moduleId,
  audience = "public",
}: {
  business: Pick<Business, "name" | "primary_color">
  moduleId: string
  /** public = end customer; owner = dashboard staff of the business */
  audience?: "public" | "owner"
}) {
  const label = moduleAccessLabel(moduleId)
  const primary = business.primary_color || "#F97316"

  const title =
    audience === "owner"
      ? "Suscripción vencida"
      : "Servicio no disponible por el momento"

  const body =
    audience === "owner"
      ? `Se venció la suscripción de Tumo de ${business.name}. Para volver a usar ${label} y el resto de los módulos, primero hay que regularizar el pago con el equipo de Tumo.`
      : `${business.name} tiene pausado el servicio de ${label} porque se venció su suscripción a Tumo. En cuanto regularicen el pago, vuelve a estar disponible.`

  const tip =
    audience === "owner"
      ? "Escribile al equipo de Tumo o esperá a que marquen el pago en el panel interno. Tus datos no se borran."
      : "Si sos el dueño del local, contactá a Tumo para reactivar la cuenta."

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-stretch gap-4 px-4 py-10">
      <div
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <p
          className="text-sm font-bold uppercase tracking-wide"
          style={{ color: primary }}
        >
          Tumo
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
          {title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-stone-700">{body}</p>
        <p className="mt-4 rounded-xl bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-600">
          {tip}
        </p>
      </div>
    </div>
  )
}
