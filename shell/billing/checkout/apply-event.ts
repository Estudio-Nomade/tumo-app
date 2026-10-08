import type { SqlTagged } from "@/modules/admin/lib/types"
import {
  canTransitionCheckout,
  type CheckoutStatus,
} from "@/shell/billing/checkout/session"
import { provisionTenant } from "@/shell/billing/checkout/provision"
import type { ProviderEvent } from "@/shell/billing/provider/types"

export type ApplyProviderEventDeps = {
  sql: SqlTagged
  providerName?: string
  now?: () => Date
  newId?: () => string
  /** Phone placeholder for owner employee row (OTP path still phone-based). */
  ownerPhonePlaceholder?: (email: string) => string
}

export type ApplyProviderEventResult =
  | {
      status: 200
      body: {
        duplicate: boolean
        sessionId: string
        sessionStatus: CheckoutStatus | null
        businessId?: string | null
      }
    }
  | { status: 400; body: { error: string; code: string } }
  | { status: 404; body: { error: string; code: string } }
  | { status: 500; body: { error: string; code: string } }

type SessionRow = {
  id: string
  status: CheckoutStatus
  email: string
  password_hash: string
  business_name: string
  payer_name: string
  payer_document: string | null
  plan_id: string
  billing_interval: string
  module_ids: string[]
  price_version: number
  amount_cents: number
  currency: string
  provider: string
  provider_checkout_id: string | null
  provider_payment_id: string | null
  provider_subscription_id: string | null
  business_id: string | null
  provision_error: string | null
}

async function insertProviderEvent(
  sql: SqlTagged,
  input: {
    provider: string
    providerEventId: string
    type: string
    externalReference: string | null
    payload: unknown
  }
): Promise<"inserted" | "duplicate"> {
  const rows = (await sql`
    INSERT INTO provider_events (
      provider, provider_event_id, type, external_reference, payload
    ) VALUES (
      ${input.provider},
      ${input.providerEventId},
      ${input.type},
      ${input.externalReference},
      ${JSON.stringify(input.payload ?? {})}
    )
    ON CONFLICT (provider, provider_event_id) DO NOTHING
    RETURNING id, provider_event_id
  `) as { id: string; provider_event_id: string }[]

  if (!rows[0]) return "duplicate"
  return "inserted"
}

async function markEventProcessed(
  sql: SqlTagged,
  provider: string,
  providerEventId: string,
  now: Date
): Promise<void> {
  await sql`
    UPDATE provider_events
    SET processed_at = ${now}
    WHERE provider = ${provider}
      AND provider_event_id = ${providerEventId}
  `
}

async function loadSession(
  sql: SqlTagged,
  id: string
): Promise<SessionRow | null> {
  const rows = (await sql`
    SELECT
      id, status, email, password_hash, business_name, payer_name, payer_document,
      plan_id, billing_interval, module_ids, price_version, amount_cents, currency,
      provider, provider_checkout_id, provider_payment_id, provider_subscription_id,
      business_id, provision_error
    FROM checkout_sessions
    WHERE id = ${id}
    LIMIT 1
  `) as SessionRow[]
  return rows[0] ?? null
}

export async function applyProviderEvent(
  deps: ApplyProviderEventDeps,
  event: ProviderEvent
): Promise<ApplyProviderEventResult> {
  const provider = deps.providerName ?? "mercadopago"
  const now = deps.now?.() ?? new Date()
  const externalReference = event.externalReference?.trim() || null

  const insert = await insertProviderEvent(deps.sql, {
    provider,
    providerEventId: event.providerEventId,
    type: event.type,
    externalReference,
    payload: event.raw,
  })

  if (insert === "duplicate") {
    const session = externalReference
      ? await loadSession(deps.sql, externalReference)
      : null
    return {
      status: 200,
      body: {
        duplicate: true,
        sessionId: externalReference ?? "",
        sessionStatus: session?.status ?? null,
        businessId: session?.business_id ?? null,
      },
    }
  }

  if (!externalReference) {
    await markEventProcessed(deps.sql, provider, event.providerEventId, now)
    return {
      status: 400,
      body: { error: "external_reference faltante.", code: "no_reference" },
    }
  }

  const session = await loadSession(deps.sql, externalReference)
  if (!session) {
    await markEventProcessed(deps.sql, provider, event.providerEventId, now)
    return {
      status: 404,
      body: { error: "Checkout session no encontrada.", code: "session_not_found" },
    }
  }

  if (event.type === "payment_pending") {
    await markEventProcessed(deps.sql, provider, event.providerEventId, now)
    return {
      status: 200,
      body: {
        duplicate: false,
        sessionId: session.id,
        sessionStatus: session.status,
        businessId: session.business_id,
      },
    }
  }

  if (event.type === "payment_failed") {
    if (canTransitionCheckout(session.status, "failed")) {
      await deps.sql`
        UPDATE checkout_sessions
        SET status = ${"failed"},
            updated_at = ${now}
        WHERE id = ${session.id}
      `
      session.status = "failed"
    }
    await markEventProcessed(deps.sql, provider, event.providerEventId, now)
    return {
      status: 200,
      body: {
        duplicate: false,
        sessionId: session.id,
        sessionStatus: session.status,
        businessId: session.business_id,
      },
    }
  }

  if (event.type !== "payment_succeeded") {
    // renewals / cancel / chargeback — record only in v1 slice
    await markEventProcessed(deps.sql, provider, event.providerEventId, now)
    return {
      status: 200,
      body: {
        duplicate: false,
        sessionId: session.id,
        sessionStatus: session.status,
        businessId: session.business_id,
      },
    }
  }

  // payment_succeeded
  if (session.status === "awaiting_payment") {
    if (!canTransitionCheckout("awaiting_payment", "paid")) {
      await markEventProcessed(deps.sql, provider, event.providerEventId, now)
      return {
        status: 500,
        body: { error: "Transición inválida a paid.", code: "state" },
      }
    }
    await deps.sql`
      UPDATE checkout_sessions
      SET status = ${"paid"},
          provider_payment_id = ${event.providerPaymentId ?? event.providerEventId},
          provider_subscription_id = ${event.providerSubscriptionId ?? null},
          updated_at = ${now}
      WHERE id = ${session.id}
    `
    session.status = "paid"
    session.provider_payment_id = event.providerPaymentId ?? event.providerEventId
  }

  if (session.status === "paid" || session.status === "provisioned") {
    const prov = await provisionTenant(deps, {
      sessionId: session.id,
      paidAt: event.paidAt ?? now,
      providerSubscriptionId: event.providerSubscriptionId ?? null,
      providerPaymentId: event.providerPaymentId ?? event.providerEventId,
    })
    if (prov.status !== 200) {
      await markEventProcessed(deps.sql, provider, event.providerEventId, now)
      return {
        status: prov.status === 404 ? 404 : 500,
        body: {
          error: String(prov.body.error ?? "provision_failed"),
          code: String(prov.body.code ?? "provision_failed"),
        },
      }
    }
    await markEventProcessed(deps.sql, provider, event.providerEventId, now)
    return {
      status: 200,
      body: {
        duplicate: false,
        sessionId: session.id,
        sessionStatus: "provisioned",
        businessId: prov.body.businessId,
      },
    }
  }

  // already failed/cancelled/expired — swallow
  await markEventProcessed(deps.sql, provider, event.providerEventId, now)
  return {
    status: 200,
    body: {
      duplicate: false,
      sessionId: session.id,
      sessionStatus: session.status,
      businessId: session.business_id,
    },
  }
}
