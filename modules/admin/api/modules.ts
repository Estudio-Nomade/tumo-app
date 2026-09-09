import { getRegisteredModuleIds } from "@/lib/modules"
import type { JsonResult, SqlTagged } from "@/modules/admin/lib/types"
import { monthlyAmountCentsForModuleCount } from "@/shell/billing/pricing"

export type AdminModulesDeps = {
  sql: SqlTagged
  getRegisteredIds?: () => string[]
  now?: () => Date
}

function normalizeModules(
  ids: string[],
  allowed: Set<string>
): { ok: true; modules: string[] } | { ok: false; invalid: string[] } {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
  const invalid = unique.filter((id) => !allowed.has(id))
  if (invalid.length > 0) {
    return { ok: false, invalid }
  }
  return { ok: true, modules: unique.sort() }
}

/**
 * Legacy bulk PUT. Activa/desactiva con fechas = now.
 * UI nueva debe usar activate/deactivate con fechas.
 */
export async function setActiveModules(
  deps: AdminModulesDeps,
  input: { businessId?: string; modules?: string[] }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  const modulesIn = input.modules

  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }
  if (!Array.isArray(modulesIn)) {
    return { status: 400, body: { error: "modules debe ser un array." } }
  }

  const allowedList = deps.getRegisteredIds?.() ?? getRegisteredModuleIds()
  const allowed = new Set(allowedList)
  const normalized = normalizeModules(modulesIn, allowed)
  if (!normalized.ok) {
    return {
      status: 400,
      body: {
        error: "Módulos inválidos.",
        invalid: normalized.invalid,
        allowed: allowedList,
      },
    }
  }

  const rows = (await deps.sql`
    UPDATE businesses
    SET active_modules = ${normalized.modules}
    WHERE id = ${businessId}
    RETURNING id, slug, active_modules
  `) as { id: string; slug: string; active_modules: string[] }[]

  if (!rows[0]) {
    return { status: 404, body: { error: "Negocio no encontrado." } }
  }

  const modules = rows[0].active_modules ?? normalized.modules
  const monthly = monthlyAmountCentsForModuleCount(modules.length)
  const now = deps.now?.() ?? new Date()

  // Sync subscriptions: activate listed, deactivate others known
  for (const moduleId of modules) {
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
        ${now},
        ${now},
        ${null},
        ${now}
      )
      ON CONFLICT (business_id, module_id) DO UPDATE SET
        status = ${"active"},
        deactivated_at = ${null},
        updated_at = ${now}
    `
  }

  await deps.sql`
    UPDATE business_module_subscriptions
    SET status = ${"inactive"},
        deactivated_at = ${now},
        updated_at = ${now}
    WHERE business_id = ${businessId}
      AND status = ${"active"}
      AND NOT (module_id = ANY(${modules}))
  `

  await deps.sql`
    INSERT INTO business_billing (
      business_id,
      monthly_amount_cents,
      status,
      updated_at
    )
    VALUES (
      ${businessId},
      ${monthly},
      ${"pendiente"},
      ${now}
    )
    ON CONFLICT (business_id) DO UPDATE SET
      monthly_amount_cents = ${monthly},
      updated_at = ${now}
  `

  return {
    status: 200,
    body: {
      id: rows[0].id,
      slug: rows[0].slug,
      active_modules: modules,
      monthly_amount_cents: monthly,
    },
  }
}
