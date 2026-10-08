import type { PlanId } from "@/shell/billing/plan-catalog"
import { ALL_MODULE_IDS } from "./module-options"
import { modulesAfterPlanChange } from "./module-selection"

export const SIGNUP_DRAFT_KEY = "tumo_signup_draft_v1"
export const SIGNUP_DRAFT_TTL_MS = 2 * 60 * 60 * 1000

export type SignupDraftV1 = {
  v: 1
  savedAt: number
  planId: PlanId
  moduleIds: string[]
  businessName: string
  payerName: string
  email: string
}

export type SignupDraftInput = Omit<SignupDraftV1, "v" | "savedAt">

const KNOWN_MODULE = new Set<string>(ALL_MODULE_IDS)

function isPlanId(value: unknown): value is PlanId {
  return value === "basico" || value === "pro" || value === "full"
}

function isValidDraft(value: unknown): value is SignupDraftV1 {
  if (!value || typeof value !== "object") return false
  const d = value as Record<string, unknown>
  return (
    d.v === 1 &&
    typeof d.savedAt === "number" &&
    Number.isFinite(d.savedAt) &&
    isPlanId(d.planId) &&
    Array.isArray(d.moduleIds) &&
    d.moduleIds.every((id) => typeof id === "string") &&
    typeof d.businessName === "string" &&
    typeof d.payerName === "string" &&
    typeof d.email === "string"
  )
}

function getDefaultStorage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/** Filter known ids + apply plan cupo (full always all modules). */
export function sanitizeDraftModules(
  planId: PlanId,
  moduleIds: string[]
): string[] {
  const known = moduleIds.filter((id) => KNOWN_MODULE.has(id))
  return modulesAfterPlanChange(planId, known)
}

export function saveSignupDraft(
  input: SignupDraftInput,
  storage: Storage | null = getDefaultStorage(),
  now: number = Date.now()
): void {
  if (!storage) return
  const draft: SignupDraftV1 = {
    v: 1,
    savedAt: now,
    planId: input.planId,
    moduleIds: sanitizeDraftModules(input.planId, input.moduleIds),
    businessName: input.businessName,
    payerName: input.payerName,
    email: input.email,
  }
  try {
    storage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* quota / private mode */
  }
}

export function loadSignupDraft(
  storage: Storage | null = getDefaultStorage(),
  now: number = Date.now()
): SignupDraftV1 | null {
  if (!storage) return null
  let raw: string | null
  try {
    raw = storage.getItem(SIGNUP_DRAFT_KEY)
  } catch {
    return null
  }
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    clearSignupDraft(storage)
    return null
  }

  if (!isValidDraft(parsed)) {
    clearSignupDraft(storage)
    return null
  }

  if (now - parsed.savedAt > SIGNUP_DRAFT_TTL_MS) {
    clearSignupDraft(storage)
    return null
  }

  const cleaned: SignupDraftV1 = {
    v: 1,
    savedAt: parsed.savedAt,
    planId: parsed.planId,
    moduleIds: sanitizeDraftModules(parsed.planId, parsed.moduleIds),
    businessName: parsed.businessName,
    payerName: parsed.payerName,
    email: parsed.email,
  }

  const extras = parsed as Record<string, unknown>
  const needsRewrite =
    "password" in extras ||
    cleaned.moduleIds.join("\0") !== parsed.moduleIds.join("\0")

  if (needsRewrite) {
    try {
      storage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(cleaned))
    } catch {
      /* ignore */
    }
  }

  return cleaned
}

export function clearSignupDraft(
  storage: Storage | null = getDefaultStorage()
): void {
  if (!storage) return
  try {
    storage.removeItem(SIGNUP_DRAFT_KEY)
  } catch {
    /* ignore */
  }
}
