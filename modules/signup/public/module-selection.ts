import type { PlanId } from "@/shell/billing/plan-catalog"
import { ALL_MODULE_IDS } from "./module-options"

export function defaultModulesForPlan(planId: PlanId): string[] {
  if (planId === "full") return [...ALL_MODULE_IDS]
  if (planId === "pro") return ["loyalty", "orders"]
  return ["loyalty"]
}

export function modulesAfterPlanChange(
  planId: PlanId,
  current: string[]
): string[] {
  if (planId === "full") return [...ALL_MODULE_IDS]
  if (planId === "basico") return current[0] ? [current[0]] : ["loyalty"]
  if (planId === "pro")
    return current.length ? current.slice(0, 3) : ["loyalty", "orders"]
  return current
}

export function toggleModuleSelection(
  planId: PlanId,
  current: string[],
  moduleId: string
): string[] {
  if (planId === "full") return current
  if (current.includes(moduleId)) {
    // basico/pro: never leave empty (server rejects; basico cupo = exactamente 1)
    if (current.length <= 1) return current
    return current.filter((x) => x !== moduleId)
  }
  if (planId === "basico") return [moduleId]
  if (current.length >= 3) return current
  return [...current, moduleId]
}

export function cupoLimit(planId: PlanId): number {
  if (planId === "basico") return 1
  if (planId === "pro") return 3
  return ALL_MODULE_IDS.length
}

export function cupoCounterLabel(
  planId: PlanId,
  selectedCount: number
): string {
  const limit = cupoLimit(planId)
  if (planId === "full") return "Incluido en Full"
  if (selectedCount >= limit) return "Cupo completo"
  return `Elegiste ${selectedCount} de ${limit}`
}
