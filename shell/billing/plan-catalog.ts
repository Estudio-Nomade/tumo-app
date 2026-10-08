/** Catálogo comercial self-serve (planes por cupo). SoT de montos lista. */

export const PRICE_VERSION = 1

export type PlanId = "basico" | "pro" | "full"

export type PlanDefinition = {
  id: PlanId
  name: string
  cupo: number
  amountUsdCentsMonth: number
  /** Snapshot ARS minor units for MP checkout (ops-updated list). */
  amountArsCentsMonth: number
}

/**
 * ARS placeholders ≈ lista comercial hasta que ops fije tabla.
 * No usar FX live en request.
 */
export const PLAN_CATALOG: PlanDefinition[] = [
  {
    id: "basico",
    name: "Básico",
    cupo: 1,
    amountUsdCentsMonth: 3999,
    amountArsCentsMonth: 3_999_000, // placeholder ARS — ops replaces
  },
  {
    id: "pro",
    name: "Pro",
    cupo: 3,
    amountUsdCentsMonth: 8999,
    amountArsCentsMonth: 8_999_000,
  },
  {
    id: "full",
    name: "Full",
    cupo: Number.POSITIVE_INFINITY,
    amountUsdCentsMonth: 12_999,
    amountArsCentsMonth: 12_999_000,
  },
]

const byId = new Map(PLAN_CATALOG.map((p) => [p.id, p]))

export function getPlan(id: string): PlanDefinition | undefined {
  return byId.get(id as PlanId)
}

export function cupoForPlan(id: PlanId | string): number {
  return getPlan(id)?.cupo ?? 0
}

export type ModuleSelectionResult =
  | { ok: true }
  | { ok: false; error: "empty" | "cupo" | "unknown_module" | "full_requires_all" }

export function isValidModuleSelection(
  planId: PlanId | string,
  moduleIds: string[],
  registeredIds: string[]
): ModuleSelectionResult {
  const plan = getPlan(planId)
  if (!plan) return { ok: false, error: "cupo" }
  const unique = [...new Set(moduleIds.map((m) => m.trim()).filter(Boolean))]
  if (unique.length === 0) return { ok: false, error: "empty" }
  const reg = new Set(registeredIds)
  for (const id of unique) {
    if (!reg.has(id)) return { ok: false, error: "unknown_module" }
  }
  if (plan.id === "full") {
    const sortedReg = [...registeredIds].sort()
    const sortedSel = [...unique].sort()
    if (
      sortedReg.length !== sortedSel.length ||
      sortedReg.some((id, i) => id !== sortedSel[i])
    ) {
      return { ok: false, error: "full_requires_all" }
    }
    return { ok: true }
  }
  if (unique.length > plan.cupo) return { ok: false, error: "cupo" }
  return { ok: true }
}

export function planLabel(id: PlanId | string): string {
  return getPlan(id)?.name ?? String(id)
}

export type SaasSubscriptionStatus =
  | "active"
  | "past_due"
  | "paused"
  | "cancelled"

export function saasStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Activa"
    case "past_due":
      return "Pago pendiente"
    case "paused":
      return "Pausada"
    case "cancelled":
      return "Cancelada"
    default:
      return status
  }
}
