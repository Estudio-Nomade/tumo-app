import type { SqlTagged } from "@/modules/admin/lib/types"
import {
  canTransitionCheckout,
  type CheckoutStatus,
} from "@/shell/billing/checkout/session"
import { nextDueAfterPayment } from "@/shell/billing/cycle"
import type { PlanId } from "@/shell/billing/plan-catalog"

export type ProvisionDeps = {
  sql: SqlTagged
  now?: () => Date
  newId?: () => string
  ownerPhonePlaceholder?: (email: string) => string
}

export type ProvisionResult =
  | {
      status: 200
      body: {
        businessId: string
        slug: string
        ownerAccountId: string
        employeeId: string
        alreadyProvisioned: boolean
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
  plan_id: PlanId | string
  billing_interval: string
  module_ids: string[]
  price_version: number
  amount_cents: number
  currency: string
  provider: string
  provider_payment_id: string | null
  provider_subscription_id: string | null
  business_id: string | null
}

function slugifyBase(name: string): string {
  const s = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  return s || "negocio"
}

function defaultOwnerPhone(email: string): string {
  // Synthetic unique phone for self-serve email owners (not used for OTP login).
  const digest = email
    .toLowerCase()
    .split("")
    .reduce((acc, c) => (acc * 33 + c.charCodeAt(0)) >>> 0, 5381)
  return `+549000${String(digest % 1_000_000_000).padStart(9, "0")}`
}

async function loadSession(
  sql: SqlTagged,
  id: string
): Promise<SessionRow | null> {
  const rows = (await sql`
    SELECT
      id, status, email, password_hash, business_name, payer_name,
      plan_id, billing_interval, module_ids, price_version, amount_cents, currency,
      provider, provider_payment_id, provider_subscription_id, business_id
    FROM checkout_sessions
    WHERE id = ${id}
    LIMIT 1
  `) as SessionRow[]
  return rows[0] ?? null
}

async function allocateSlug(
  sql: SqlTagged,
  businessName: string,
  sessionId: string
): Promise<string> {
  const base = slugifyBase(businessName)
  const short = sessionId.replace(/-/g, "").slice(0, 8)
  const candidates = [
    base,
    `${base}-${short}`,
    `${base}-${short}${Math.floor(Math.random() * 1000)}`,
  ]
  for (const slug of candidates) {
    const existing = (await sql`
      SELECT id FROM businesses WHERE slug = ${slug} LIMIT 1
    `) as { id: string }[]
    if (!existing[0]) return slug
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

export async function provisionTenant(
  deps: ProvisionDeps,
  input: {
    sessionId: string
    paidAt?: Date
    providerSubscriptionId?: string | null
    providerPaymentId?: string | null
  }
): Promise<ProvisionResult> {
  const now = deps.now?.() ?? new Date()
  const paidAt = input.paidAt ?? now
  const session = await loadSession(deps.sql, input.sessionId)
  if (!session) {
    return {
      status: 404,
      body: { error: "Checkout session no encontrada.", code: "session_not_found" },
    }
  }

  if (session.status === "provisioned" && session.business_id) {
    return {
      status: 200,
      body: {
        businessId: session.business_id,
        slug: "",
        ownerAccountId: "",
        employeeId: "",
        alreadyProvisioned: true,
      },
    }
  }

  if (session.status !== "paid" && session.status !== "provisioned") {
    return {
      status: 400,
      body: {
        error: "Session no está paid.",
        code: "not_paid",
      },
    }
  }

  // Idempotent: already has business linked
  if (session.business_id) {
    if (canTransitionCheckout(session.status, "provisioned") || session.status === "paid") {
      await deps.sql`
        UPDATE checkout_sessions
        SET status = ${"provisioned"},
            updated_at = ${now}
        WHERE id = ${session.id}
      `
    }
    return {
      status: 200,
      body: {
        businessId: session.business_id,
        slug: "",
        ownerAccountId: "",
        employeeId: "",
        alreadyProvisioned: true,
      },
    }
  }

  const moduleIds = [...new Set((session.module_ids ?? []).map(String))].sort()
  const slug = await allocateSlug(deps.sql, session.business_name, session.id)

  let businessId: string
  try {
    const bizRows = (await deps.sql`
      INSERT INTO businesses (
        name, slug, active_modules
      ) VALUES (
        ${session.business_name},
        ${slug},
        ${moduleIds}
      )
      RETURNING id, slug, name
    `) as { id: string; slug: string; name: string }[]
    businessId = bizRows[0]?.id
    if (!businessId) {
      return {
        status: 500,
        body: { error: "No se creó el negocio.", code: "business_insert" },
      }
    }
  } catch (e) {
    return {
      status: 500,
      body: {
        error: e instanceof Error ? e.message : "business_insert_failed",
        code: "business_insert",
      },
    }
  }

  // owner_accounts
  let ownerAccountId: string
  const existingOa = (await deps.sql`
    SELECT id, email, password_hash FROM owner_accounts
    WHERE email = ${session.email}
    LIMIT 1
  `) as { id: string; email: string; password_hash: string }[]
  if (existingOa[0]) {
    ownerAccountId = existingOa[0].id
  } else {
    const oaRows = (await deps.sql`
      INSERT INTO owner_accounts (email, password_hash)
      VALUES (${session.email}, ${session.password_hash})
      RETURNING id, email, password_hash
    `) as { id: string; email: string; password_hash: string }[]
    ownerAccountId = oaRows[0]?.id
    if (!ownerAccountId) {
      return {
        status: 500,
        body: { error: "No se creó owner_account.", code: "owner_insert" },
      }
    }
  }

  const phoneFn = deps.ownerPhonePlaceholder ?? defaultOwnerPhone
  const phone = phoneFn(session.email)
  const empRows = (await deps.sql`
    INSERT INTO employees (
      name, phone, role, business_id, owner_account_id
    ) VALUES (
      ${session.payer_name},
      ${phone},
      ${"owner"},
      ${businessId},
      ${ownerAccountId}
    )
    RETURNING id, name, phone, role, business_id, owner_account_id
  `) as {
    id: string
    name: string
    phone: string
    role: string
    business_id: string
    owner_account_id: string | null
  }[]
  const employeeId = empRows[0]?.id ?? ""

  // module subscriptions
  for (const moduleId of moduleIds) {
    await deps.sql`
      INSERT INTO business_module_subscriptions (
        business_id,
        module_id,
        status,
        activated_at,
        billing_anchor_at,
        deactivated_at,
        updated_at
      ) VALUES (
        ${businessId},
        ${moduleId},
        ${"active"},
        ${paidAt},
        ${paidAt},
        ${null},
        ${now}
      )
      ON CONFLICT (business_id, module_id) DO UPDATE SET
        status = ${"active"},
        activated_at = ${paidAt},
        billing_anchor_at = ${paidAt},
        deactivated_at = ${null},
        updated_at = ${now}
    `
  }

  await deps.sql`
    UPDATE businesses
    SET active_modules = ${moduleIds}
    WHERE id = ${businessId}
  `

  const nextDue = nextDueAfterPayment(paidAt)
  const amount = session.amount_cents

  await deps.sql`
    INSERT INTO business_billing (
      business_id,
      monthly_amount_cents,
      status,
      last_payment_at,
      next_due_at,
      updated_at
    ) VALUES (
      ${businessId},
      ${amount},
      ${"al_dia"},
      ${paidAt},
      ${nextDue},
      ${now}
    )
    ON CONFLICT (business_id) DO UPDATE SET
      monthly_amount_cents = ${amount},
      status = ${"al_dia"},
      last_payment_at = ${paidAt},
      next_due_at = ${nextDue},
      updated_at = ${now}
  `

  await deps.sql`
    INSERT INTO business_billing_payments (
      business_id,
      amount_cents,
      paid_at,
      note
    ) VALUES (
      ${businessId},
      ${amount},
      ${paidAt},
      ${"saas_checkout"}
    )
  `

  const subId = input.providerSubscriptionId ?? session.provider_subscription_id
  await deps.sql`
    INSERT INTO tenant_subscriptions (
      business_id,
      checkout_session_id,
      plan_id,
      billing_interval,
      module_ids,
      amount_cents,
      currency,
      price_version,
      status,
      provider,
      provider_subscription_id,
      current_period_end,
      subscribed_at,
      updated_at
    ) VALUES (
      ${businessId},
      ${session.id},
      ${session.plan_id},
      ${session.billing_interval || "month"},
      ${moduleIds},
      ${amount},
      ${session.currency || "ARS"},
      ${session.price_version || 1},
      ${"active"},
      ${"mercadopago"},
      ${subId},
      ${nextDue},
      ${paidAt},
      ${now}
    )
  `

  if (!canTransitionCheckout("paid", "provisioned") && session.status !== "provisioned") {
    // allow if already conceptually paid path
  }

  await deps.sql`
    UPDATE checkout_sessions
    SET status = ${"provisioned"},
        business_id = ${businessId},
        provider_payment_id = ${input.providerPaymentId ?? session.provider_payment_id},
        provider_subscription_id = ${subId},
        provision_error = ${null},
        updated_at = ${now}
    WHERE id = ${session.id}
  `

  return {
    status: 200,
    body: {
      businessId,
      slug,
      ownerAccountId,
      employeeId,
      alreadyProvisioned: false,
    },
  }
}
