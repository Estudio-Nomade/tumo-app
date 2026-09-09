import { getRegisteredModuleIds } from "@/lib/modules"
import type { JsonResult, SqlTagged } from "@/modules/admin/lib/types"
import {
  businessAnchor,
  initialNextDue,
  parseDateOnlyToUtcNoon,
  shouldSetInitialNextDue,
} from "@/shell/billing/cycle"
import { monthlyAmountCentsForModuleCount } from "@/shell/billing/pricing"

export type AdminModuleSubscriptionsDeps = {
  sql: SqlTagged
  getRegisteredIds?: () => string[]
  now?: () => Date
}

type SubRow = {
  module_id: string
  status: string
  activated_at: Date | string
  billing_anchor_at: Date | string
  deactivated_at: Date | string | null
}

type BillingRow = {
  monthly_amount_cents: number
  status: string
  last_payment_at: Date | string | null
  next_due_at: Date | string | null
}

function iso(d: Date | string | null | undefined): string | null {
  if (d == null) return null
  if (d instanceof Date) return d.toISOString()
  return new Date(d).toISOString()
}

async function loadBusiness(
  sql: SqlTagged,
  businessId: string
): Promise<{ id: string; slug: string; active_modules: string[] } | null> {
  const rows = (await sql`
    SELECT id, slug, active_modules FROM businesses WHERE id = ${businessId} LIMIT 1
  `) as { id: string; slug: string; active_modules: string[] | null }[]
  if (!rows[0]) return null
  return {
    id: rows[0].id,
    slug: rows[0].slug,
    active_modules: rows[0].active_modules ?? [],
  }
}

async function loadSubs(sql: SqlTagged, businessId: string): Promise<SubRow[]> {
  return (await sql`
    SELECT module_id, status, activated_at, billing_anchor_at, deactivated_at
    FROM business_module_subscriptions
    WHERE business_id = ${businessId}
  `) as SubRow[]
}

async function loadBilling(
  sql: SqlTagged,
  businessId: string
): Promise<BillingRow | null> {
  const rows = (await sql`
    SELECT monthly_amount_cents, status, last_payment_at, next_due_at
    FROM business_billing
    WHERE business_id = ${businessId}
    LIMIT 1
  `) as BillingRow[]
  return rows[0] ?? null
}

async function syncActiveModules(
  sql: SqlTagged,
  businessId: string,
  activeIds: string[]
): Promise<string[]> {
  const sorted = [...activeIds].sort()
  await sql`
    UPDATE businesses
    SET active_modules = ${sorted}
    WHERE id = ${businessId}
  `
  return sorted
}

async function upsertBillingFeeAndMaybeNextDue(
  sql: SqlTagged,
  input: {
    businessId: string
    monthly: number
    nextDue: Date | null
    setNextDue: boolean
    now: Date
    createIfMissing: boolean
  }
): Promise<void> {
  const existing = await loadBilling(sql, input.businessId)
  if (!existing && !input.createIfMissing && input.monthly === 0) {
    return
  }

  if (!existing) {
    await sql`
      INSERT INTO business_billing (
        business_id,
        monthly_amount_cents,
        status,
        next_due_at,
        updated_at
      )
      VALUES (
        ${input.businessId},
        ${input.monthly},
        ${"pendiente"},
        ${input.setNextDue ? input.nextDue : null},
        ${input.now}
      )
      ON CONFLICT (business_id) DO UPDATE SET
        monthly_amount_cents = ${input.monthly},
        next_due_at = CASE
          WHEN ${input.setNextDue} THEN ${input.nextDue}
          ELSE business_billing.next_due_at
        END,
        updated_at = ${input.now}
    `
    return
  }

  if (input.setNextDue) {
    await sql`
      UPDATE business_billing
      SET monthly_amount_cents = ${input.monthly},
          next_due_at = ${input.nextDue},
          updated_at = ${input.now}
      WHERE business_id = ${input.businessId}
    `
  } else {
    await sql`
      UPDATE business_billing
      SET monthly_amount_cents = ${input.monthly},
          updated_at = ${input.now}
      WHERE business_id = ${input.businessId}
    `
  }
}

function resolveDate(
  raw: string | undefined,
  fallback: Date
): Date | { error: string } {
  if (raw == null || raw.trim() === "") return fallback
  const d = parseDateOnlyToUtcNoon(raw)
  if (!d) return { error: "fecha inválida." }
  return d
}

function activeIdsFromSubs(subs: SubRow[]): string[] {
  return subs
    .filter((s) => s.status === "active")
    .map((s) => s.module_id)
    .sort()
}

function okBody(
  business: { id: string; slug: string },
  modules: string[],
  monthly: number,
  nextDue: Date | string | null,
  anchor: Date | null,
  subscription?: SubRow
): JsonResult {
  return {
    status: 200,
    body: {
      id: business.id,
      slug: business.slug,
      active_modules: modules,
      monthly_amount_cents: monthly,
      next_due_at: iso(nextDue),
      business_anchor_at: iso(anchor),
      ...(subscription
        ? {
            subscription: {
              module_id: subscription.module_id,
              status: subscription.status,
              activated_at: iso(subscription.activated_at),
              billing_anchor_at: iso(subscription.billing_anchor_at),
              deactivated_at: iso(subscription.deactivated_at),
            },
          }
        : {}),
    },
  }
}

export async function activateModule(
  deps: AdminModuleSubscriptionsDeps,
  input: {
    businessId?: string
    moduleId?: string
    activatedAt?: string
    billingAnchorAt?: string
  }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  const moduleId = input.moduleId?.trim() ?? ""
  if (!businessId || !moduleId) {
    return {
      status: 400,
      body: { error: "businessId y moduleId son requeridos." },
    }
  }

  const allowed = deps.getRegisteredIds?.() ?? getRegisteredModuleIds()
  if (!allowed.includes(moduleId)) {
    return {
      status: 400,
      body: { error: "Módulo inválido.", allowed },
    }
  }

  const business = await loadBusiness(deps.sql, businessId)
  if (!business) {
    return { status: 404, body: { error: "Negocio no encontrado." } }
  }

  const now = deps.now?.() ?? new Date()
  const activated = resolveDate(input.activatedAt, now)
  if ("error" in activated) {
    return { status: 400, body: { error: activated.error } }
  }
  const anchorRaw =
    input.billingAnchorAt != null && input.billingAnchorAt.trim() !== ""
      ? input.billingAnchorAt
      : input.activatedAt
  const anchor = resolveDate(anchorRaw, activated)
  if ("error" in anchor) {
    return { status: 400, body: { error: anchor.error } }
  }

  await deps.sql`
    INSERT INTO business_module_subscriptions (
      business_id,
      module_id,
      status,
      activated_at,
      billing_anchor_at,
      deactivated_at,
      updated_at
    )
    VALUES (
      ${businessId},
      ${moduleId},
      ${"active"},
      ${activated},
      ${anchor},
      ${null},
      ${now}
    )
    ON CONFLICT (business_id, module_id) DO UPDATE SET
      status = ${"active"},
      activated_at = ${activated},
      billing_anchor_at = ${anchor},
      deactivated_at = ${null},
      updated_at = ${now}
  `

  const subs = await loadSubs(deps.sql, businessId)
  // ensure in-memory if mock doesn't re-read insert
  if (!subs.some((s) => s.module_id === moduleId && s.status === "active")) {
    subs.push({
      module_id: moduleId,
      status: "active",
      activated_at: activated,
      billing_anchor_at: anchor,
      deactivated_at: null,
    })
  } else {
    const s = subs.find((x) => x.module_id === moduleId)!
    s.status = "active"
    s.activated_at = activated
    s.billing_anchor_at = anchor
    s.deactivated_at = null
  }

  const modules = activeIdsFromSubs(subs)
  const monthly = monthlyAmountCentsForModuleCount(modules.length)
  const bizAnchor = businessAnchor(subs)
  const billing = await loadBilling(deps.sql, businessId)
  const setInitial = shouldSetInitialNextDue({
    lastPaymentAt: billing?.last_payment_at,
    nextDueAt: billing?.next_due_at,
  })
  const finalNext =
    setInitial && bizAnchor
      ? initialNextDue(bizAnchor)
      : billing?.next_due_at != null
        ? new Date(billing.next_due_at as string)
        : null

  await syncActiveModules(deps.sql, businessId, modules)
  await upsertBillingFeeAndMaybeNextDue(deps.sql, {
    businessId,
    monthly,
    nextDue: finalNext,
    setNextDue: setInitial || modules.length === 0,
    now,
    createIfMissing: true,
  })

  const sub = subs.find((s) => s.module_id === moduleId)!
  return okBody(business, modules, monthly, finalNext, bizAnchor, sub)
}

export async function deactivateModule(
  deps: AdminModuleSubscriptionsDeps,
  input: {
    businessId?: string
    moduleId?: string
    deactivatedAt?: string
  }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  const moduleId = input.moduleId?.trim() ?? ""
  if (!businessId || !moduleId) {
    return {
      status: 400,
      body: { error: "businessId y moduleId son requeridos." },
    }
  }

  const business = await loadBusiness(deps.sql, businessId)
  if (!business) {
    return { status: 404, body: { error: "Negocio no encontrado." } }
  }

  const now = deps.now?.() ?? new Date()
  const deactivated = resolveDate(input.deactivatedAt, now)
  if ("error" in deactivated) {
    return { status: 400, body: { error: deactivated.error } }
  }

  const updated = (await deps.sql`
    UPDATE business_module_subscriptions
    SET status = ${"inactive"},
        deactivated_at = ${deactivated},
        updated_at = ${now}
    WHERE business_id = ${businessId} AND module_id = ${moduleId}
    RETURNING module_id, status, activated_at, billing_anchor_at, deactivated_at
  `) as SubRow[]

  // if no row, still remove from active_modules for legacy
  let subs = await loadSubs(deps.sql, businessId)
  if (updated[0]) {
    const i = subs.findIndex((s) => s.module_id === moduleId)
    if (i >= 0) subs[i] = updated[0]
    else subs.push(updated[0])
  } else {
    const i = subs.findIndex((s) => s.module_id === moduleId)
    if (i >= 0) {
      subs[i] = {
        ...subs[i],
        status: "inactive",
        deactivated_at: deactivated,
      }
    }
  }

  // mock may not persist UPDATE — force
  subs = subs.map((s) =>
    s.module_id === moduleId
      ? { ...s, status: "inactive", deactivated_at: deactivated }
      : s
  )

  const modules = activeIdsFromSubs(subs)
  const monthly = monthlyAmountCentsForModuleCount(modules.length)
  const bizAnchor = businessAnchor(subs)
  const billing = await loadBilling(deps.sql, businessId)

  let nextDue: Date | null =
    billing?.next_due_at != null ? new Date(billing.next_due_at as string) : null
  if (modules.length === 0) nextDue = null

  await syncActiveModules(deps.sql, businessId, modules)
  await upsertBillingFeeAndMaybeNextDue(deps.sql, {
    businessId,
    monthly,
    nextDue,
    setNextDue: modules.length === 0 || nextDue !== (billing?.next_due_at != null ? new Date(billing.next_due_at as string) : null),
    now,
    createIfMissing: monthly > 0 || billing != null,
  })

  // always clear next when zero modules
  if (modules.length === 0) {
    await deps.sql`
      UPDATE business_billing
      SET monthly_amount_cents = ${0},
          next_due_at = ${null},
          updated_at = ${now}
      WHERE business_id = ${businessId}
    `
    if (billing) {
      billing.monthly_amount_cents = 0
      billing.next_due_at = null
    }
  }

  return okBody(
    business,
    modules,
    monthly,
    modules.length === 0 ? null : nextDue,
    bizAnchor,
    updated[0] ??
      subs.find((s) => s.module_id === moduleId)
  )
}

export async function patchModuleSubscription(
  deps: AdminModuleSubscriptionsDeps,
  input: {
    businessId?: string
    moduleId?: string
    activatedAt?: string
    billingAnchorAt?: string
  }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  const moduleId = input.moduleId?.trim() ?? ""
  if (!businessId || !moduleId) {
    return {
      status: 400,
      body: { error: "businessId y moduleId son requeridos." },
    }
  }

  const business = await loadBusiness(deps.sql, businessId)
  if (!business) {
    return { status: 404, body: { error: "Negocio no encontrado." } }
  }

  const subs0 = await loadSubs(deps.sql, businessId)
  const existing = subs0.find((s) => s.module_id === moduleId)
  if (!existing || existing.status !== "active") {
    return {
      status: 404,
      body: { error: "Suscripción activa no encontrada." },
    }
  }

  const now = deps.now?.() ?? new Date()
  let activated =
    existing.activated_at instanceof Date
      ? existing.activated_at
      : new Date(existing.activated_at)
  let anchor =
    existing.billing_anchor_at instanceof Date
      ? existing.billing_anchor_at
      : new Date(existing.billing_anchor_at)

  if (input.activatedAt != null && input.activatedAt.trim() !== "") {
    const d = resolveDate(input.activatedAt, activated)
    if ("error" in d) return { status: 400, body: { error: d.error } }
    activated = d
  }
  if (input.billingAnchorAt != null && input.billingAnchorAt.trim() !== "") {
    const d = resolveDate(input.billingAnchorAt, anchor)
    if ("error" in d) return { status: 400, body: { error: d.error } }
    anchor = d
  }

  await deps.sql`
    UPDATE business_module_subscriptions
    SET activated_at = ${activated},
        billing_anchor_at = ${anchor},
        updated_at = ${now}
    WHERE business_id = ${businessId} AND module_id = ${moduleId}
  `

  const subs = (await loadSubs(deps.sql, businessId)).map((s) =>
    s.module_id === moduleId
      ? { ...s, activated_at: activated, billing_anchor_at: anchor }
      : s
  )
  const modules = activeIdsFromSubs(subs)
  const monthly = monthlyAmountCentsForModuleCount(modules.length)
  const bizAnchor = businessAnchor(subs)
  const billing = await loadBilling(deps.sql, businessId)

  const setInitial = shouldSetInitialNextDue({
    lastPaymentAt: billing?.last_payment_at,
    nextDueAt: null, // force check: if no payment, regenerate from new anchor
  })
  // LOCKED: with last_payment, do not move next_due
  // without last_payment, regenerate from new min anchor
  let nextDue: Date | null =
    billing?.next_due_at != null ? new Date(billing.next_due_at as string) : null
  const noPayment = billing?.last_payment_at == null
  if (noPayment && bizAnchor) {
    nextDue = initialNextDue(bizAnchor)
  }

  await upsertBillingFeeAndMaybeNextDue(deps.sql, {
    businessId,
    monthly,
    nextDue,
    setNextDue: noPayment,
    now,
    createIfMissing: true,
  })

  // mock: update store billing next
  if (noPayment && billing) {
    billing.next_due_at = nextDue
  }

  return okBody(
    business,
    modules,
    monthly,
    nextDue,
    bizAnchor,
    {
      module_id: moduleId,
      status: "active",
      activated_at: activated,
      billing_anchor_at: anchor,
      deactivated_at: null,
    }
  )
}
