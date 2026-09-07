import type { Business } from "@/lib/modules"

export type TenantBillingStatus = "al_dia" | "pendiente" | "vencido"

export type BusinessBillingSnapshot = {
  status: TenantBillingStatus | null | undefined
  next_due_at?: string | Date | null
}

function toTime(value: string | Date | null | undefined): number | null {
  if (value == null || value === "") return null
  if (value instanceof Date) {
    const t = value.getTime()
    return Number.isFinite(t) ? t : null
  }
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : null
}

/** True when tenant product access should be paused for non-payment. */
export function isBillingOverdue(
  billing: BusinessBillingSnapshot | null | undefined,
  now: Date = new Date()
): boolean {
  if (!billing) return false
  if (billing.status === "vencido") return true
  const due = toTime(billing.next_due_at)
  if (due == null) return false
  return due <= now.getTime()
}

export function billingSnapshotFromBusiness(
  business: Pick<Business, "billing_status" | "billing_next_due_at">
): BusinessBillingSnapshot | null {
  if (
    business.billing_status == null &&
    business.billing_next_due_at == null
  ) {
    return null
  }
  return {
    status: business.billing_status ?? null,
    next_due_at: business.billing_next_due_at ?? null,
  }
}

/** Contracted module AND billing not overdue. */
export function hasModuleAccess(
  business: Pick<
    Business,
    "active_modules" | "billing_status" | "billing_next_due_at"
  >,
  moduleId: string,
  now: Date = new Date()
): boolean {
  return evaluateModuleAccess(business, moduleId, now).ok
}

export type ModuleAccessReason = "ok" | "not_contracted" | "billing_overdue"

export type ModuleAccessResult = {
  ok: boolean
  reason: ModuleAccessReason
}

/**
 * Distinguishes "never bought this module" vs "paused for unpaid Tumo fee".
 * Contract check first so a business that never had orders still 404s as not found,
 * not as subscription expired.
 */
export function evaluateModuleAccess(
  business: Pick<
    Business,
    "active_modules" | "billing_status" | "billing_next_due_at"
  >,
  moduleId: string,
  now: Date = new Date()
): ModuleAccessResult {
  if (!business.active_modules?.includes(moduleId)) {
    return { ok: false, reason: "not_contracted" }
  }
  if (isBillingOverdue(billingSnapshotFromBusiness(business), now)) {
    return { ok: false, reason: "billing_overdue" }
  }
  return { ok: true, reason: "ok" }
}

/** Whether shell should persist status=vencido (lazy expire). */
export function shouldPersistVencido(
  billing: BusinessBillingSnapshot | null | undefined,
  now: Date = new Date()
): boolean {
  if (!billing) return false
  if (billing.status === "vencido") return false
  const due = toTime(billing.next_due_at)
  if (due == null) return false
  return due <= now.getTime()
}
