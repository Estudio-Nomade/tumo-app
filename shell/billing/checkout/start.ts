import type { SqlTagged } from "@/modules/admin/lib/types"
import {
  canTransitionCheckout,
  createCheckoutSessionInput,
  type CheckoutStatus,
  type CreateCheckoutSessionFields,
} from "@/shell/billing/checkout/session"
import type { PaymentProvider } from "@/shell/billing/provider/types"
import { planLabel } from "@/shell/billing/plan-catalog"

export type StartCheckoutDeps = {
  sql: SqlTagged
  provider: PaymentProvider
  appBaseUrl: string
  /** Inject for tests — default crypto.randomUUID */
  newId?: () => string
  /** Hash password — default identity store (tests); real = argon later */
  hashPassword?: (plain: string) => Promise<string> | string
  now?: () => Date
  registeredModuleIds?: () => string[]
}

export type StartCheckoutResult =
  | {
      status: 200
      body: {
        sessionId: string
        redirectUrl: string
        providerCheckoutId: string
      }
    }
  | { status: 400; body: { error: string; code: string } }
  | { status: 409; body: { error: string; code: string } }
  | { status: 500; body: { error: string; code: string } }

function expiresInTwoHours(now: Date): Date {
  return new Date(now.getTime() + 2 * 60 * 60 * 1000)
}

export async function startCheckout(
  deps: StartCheckoutDeps,
  raw: Omit<CreateCheckoutSessionFields, "registeredModuleIds"> & {
    registeredModuleIds?: string[]
  }
): Promise<StartCheckoutResult> {
  const registry =
    raw.registeredModuleIds ??
    deps.registeredModuleIds?.() ??
    ["loyalty", "orders", "turnos"]

  const built = createCheckoutSessionInput({
    ...raw,
    registeredModuleIds: registry,
  })
  if (!built.ok) {
    return {
      status: 400,
      body: { error: `Datos inválidos: ${built.error}`, code: built.error },
    }
  }
  const draft = built.value
  const now = deps.now?.() ?? new Date()
  const id = deps.newId?.() ?? crypto.randomUUID()
  const hashFn = deps.hashPassword ?? ((p: string) => p)
  const password_hash = await hashFn(draft.password)

  const base = deps.appBaseUrl.replace(/\/$/, "")
  const continueUrl = `${base}/signup/continue?session=${id}`

  // Close previous open sessions for same email (best-effort)
  await deps.sql`
    UPDATE checkout_sessions
    SET status = ${"expired"},
        updated_at = ${now}
    WHERE email = ${draft.email}
      AND (status = ${"started"} OR status = ${"awaiting_payment"})
  `

  await deps.sql`
    INSERT INTO checkout_sessions (
      id, status, email, password_hash, business_name,
      payer_name, payer_document, plan_id, billing_interval,
      module_ids, price_version, amount_cents, currency,
      provider, expires_at, created_at, updated_at
    ) VALUES (
      ${id},
      ${"started"},
      ${draft.email},
      ${password_hash},
      ${draft.business_name},
      ${draft.payer_name},
      ${draft.payer_document},
      ${draft.plan_id},
      ${draft.billing_interval},
      ${draft.module_ids},
      ${draft.price_version},
      ${draft.amount_cents},
      ${draft.currency},
      ${deps.provider.name},
      ${expiresInTwoHours(now)},
      ${now},
      ${now}
    )
  `

  let checkout
  try {
    checkout = await deps.provider.createCheckout({
      externalReference: id,
      planId: draft.plan_id,
      title: `Tumo ${planLabel(draft.plan_id)}`,
      amountArsCents: draft.amount_cents,
      payerEmail: draft.email,
      payerName: draft.payer_name,
      payerDocument: draft.payer_document,
      successUrl: continueUrl,
      failureUrl: `${continueUrl}&result=failure`,
      pendingUrl: `${continueUrl}&result=pending`,
      notificationUrl: `${base}/api/billing/webhooks/mercadopago`,
    })
  } catch {
    return {
      status: 500,
      body: { error: "No se pudo crear el checkout.", code: "provider_error" },
    }
  }

  if (!canTransitionCheckout("started", "awaiting_payment")) {
    return {
      status: 500,
      body: { error: "Transición inválida.", code: "state" },
    }
  }

  await deps.sql`
    UPDATE checkout_sessions
    SET status = ${"awaiting_payment" satisfies CheckoutStatus},
        provider_checkout_id = ${checkout.providerCheckoutId},
        updated_at = ${now}
    WHERE id = ${id}
  `

  return {
    status: 200,
    body: {
      sessionId: id,
      redirectUrl: checkout.redirectUrl,
      providerCheckoutId: checkout.providerCheckoutId,
    },
  }
}
