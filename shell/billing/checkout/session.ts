import {
  PRICE_VERSION,
  getPlan,
  isValidModuleSelection,
  type PlanId,
} from "@/shell/billing/plan-catalog"

export type CheckoutStatus =
  | "started"
  | "awaiting_payment"
  | "paid"
  | "provisioned"
  | "failed"
  | "expired"
  | "cancelled"

const ALLOWED: Record<CheckoutStatus, CheckoutStatus[]> = {
  started: ["awaiting_payment", "cancelled", "expired"],
  awaiting_payment: ["paid", "failed", "expired", "cancelled"],
  paid: ["provisioned"],
  provisioned: [],
  failed: [],
  expired: [],
  cancelled: [],
}

export function canTransitionCheckout(
  from: CheckoutStatus,
  to: CheckoutStatus
): boolean {
  return (ALLOWED[from] ?? []).includes(to)
}

export type CheckoutSessionDraft = {
  status: "started"
  email: string
  password: string
  business_name: string
  payer_name: string
  payer_document: string | null
  plan_id: PlanId
  billing_interval: "month"
  module_ids: string[]
  price_version: number
  amount_cents: number
  currency: "ARS"
}

export type CreateCheckoutSessionFields = {
  email: string
  password: string
  businessName: string
  payerName: string
  payerDocument?: string
  planId: string
  moduleIds: string[]
  registeredModuleIds: string[]
}

export type CreateCheckoutSessionResult =
  | { ok: true; value: CheckoutSessionDraft }
  | {
      ok: false
      error:
        | "email"
        | "password"
        | "business_name"
        | "payer_name"
        | "plan"
        | "cupo"
        | "unknown_module"
        | "empty"
        | "full_requires_all"
    }

export function createCheckoutSessionInput(
  input: CreateCheckoutSessionFields
): CreateCheckoutSessionResult {
  const email = input.email.trim().toLowerCase()
  if (!email || !email.includes("@")) return { ok: false, error: "email" }
  if (!input.password || input.password.length < 1) {
    return { ok: false, error: "password" }
  }
  const business_name = input.businessName.trim()
  if (!business_name) return { ok: false, error: "business_name" }
  const payer_name = input.payerName.trim()
  if (!payer_name) return { ok: false, error: "payer_name" }

  const plan = getPlan(input.planId)
  if (!plan) return { ok: false, error: "plan" }

  const sel = isValidModuleSelection(
    plan.id,
    input.moduleIds,
    input.registeredModuleIds
  )
  if (!sel.ok) return { ok: false, error: sel.error }

  const module_ids = [...new Set(input.moduleIds.map((m) => m.trim()).filter(Boolean))].sort()

  return {
    ok: true,
    value: {
      status: "started",
      email,
      password: input.password,
      business_name,
      payer_name,
      payer_document: input.payerDocument?.trim() || null,
      plan_id: plan.id,
      billing_interval: "month",
      module_ids,
      price_version: PRICE_VERSION,
      amount_cents: plan.amountArsCentsMonth,
      currency: "ARS",
    },
  }
}
