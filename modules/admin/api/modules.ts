import { getRegisteredModuleIds } from "@/lib/modules"
import type { JsonResult, SqlTagged } from "@/modules/admin/lib/types"
import { monthlyAmountCentsForModuleCount } from "@/shell/billing/pricing"

export type AdminModulesDeps = {
  sql: SqlTagged
  getRegisteredIds?: () => string[]
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
  const now = new Date()

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
