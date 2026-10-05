import { ModuleBadge } from "@/modules/admin/dashboard/billing-badge"

export type SaasSubscriptionData = {
  id?: string | null
  plan_id: string
  plan_label: string
  billing_interval?: string
  status: string
  status_label: string
  subscribed_at: string | null
  module_ids: string[]
  amount_cents: number
  currency: string
  provider: string
  provider_subscription_id?: string | null
  current_period_end?: string | null
  grace_deadline_at?: string | null
  price_version?: number
}

function formatMoney(cents: number, currency = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("es-AR")
  } catch {
    return iso
  }
}

function providerLabel(provider: string): string {
  if (provider === "mercadopago") return "Mercado Pago"
  return provider
}

/** Presentational block for self-serve SaaS sub (no router). */
export function SaasSubscriptionSection({
  subscription,
}: {
  subscription: SaasSubscriptionData
}) {
  return (
    <section
      className="rounded-xl border border-violet-200 bg-violet-50/40 p-4"
      data-saas-subscription
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-700">
        Suscripción
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-violet-600 px-3 py-1 text-sm font-semibold text-white">
          {subscription.plan_label}
        </span>
        <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-sm text-violet-900">
          {subscription.status_label}
        </span>
        <span className="text-sm text-slate-600">
          {providerLabel(subscription.provider)}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-400">Suscripto desde</dt>
          <dd>{formatDate(subscription.subscribed_at)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Monto del ciclo</dt>
          <dd className="font-medium tabular-nums">
            {formatMoney(
              subscription.amount_cents,
              subscription.currency || "ARS"
            )}
            {subscription.billing_interval === "week" ? " / sem" : " / mes"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Fin del período</dt>
          <dd>{formatDate(subscription.current_period_end ?? null)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Id proveedor</dt>
          <dd className="truncate font-mono text-xs">
            {subscription.provider_subscription_id || "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-slate-400">Módulos del plan</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {(subscription.module_ids ?? []).map((id) => (
              <ModuleBadge key={id} id={id} />
            ))}
          </dd>
        </div>
      </dl>
    </section>
  )
}
