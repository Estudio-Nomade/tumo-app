"use client"

import Link from "next/link"
import { useEffect, useState, useSyncExternalStore } from "react"
import { PLANS } from "@/modules/landing/config"
import { PLAN_CATALOG, type PlanId } from "@/shell/billing/plan-catalog"
import { MODULE_OPTIONS } from "./module-options"
import {
  messageFromCheckoutHttp,
  NETWORK_ERROR_MESSAGE,
} from "./checkout-client-errors"
import {
  cupoCounterLabel,
  defaultModulesForPlan,
  modulesAfterPlanChange,
  toggleModuleSelection,
} from "./module-selection"
import {
  loadSignupDraft,
  saveSignupDraft,
  type SignupDraftV1,
} from "./signup-draft"

function parsePlanId(value?: string): PlanId {
  return value === "basico" || value === "pro" || value === "full"
    ? value
    : "basico"
}

function priceUsd(planId: PlanId): string {
  const cents =
    PLAN_CATALOG.find((p) => p.id === planId)?.amountUsdCentsMonth ?? 0
  return (cents / 100).toFixed(2)
}

function cupoLabelFor(planId: PlanId): string {
  return PLANS.find((p) => p.id === planId)?.cupoLabel ?? ""
}

function subscribeDraftNoop() {
  return () => {}
}

let cachedDraftKey = ""
let cachedDraft: SignupDraftV1 | null = null

/** Stable getSnapshot for useSyncExternalStore (same ref when content unchanged). */
function readClientDraft(): SignupDraftV1 | null {
  const draft = loadSignupDraft()
  const key = draft ? JSON.stringify(draft) : ""
  if (key === cachedDraftKey) return cachedDraft
  cachedDraftKey = key
  cachedDraft = draft
  return cachedDraft
}

type FormFields = {
  planId: PlanId
  modules: string[]
  businessName: string
  payerName: string
  email: string
}

function fieldsFromDraft(
  draft: SignupDraftV1 | null,
  fallbackPlan: PlanId
): FormFields {
  if (!draft) {
    return {
      planId: fallbackPlan,
      modules: defaultModulesForPlan(fallbackPlan),
      businessName: "",
      payerName: "",
      email: "",
    }
  }
  return {
    planId: draft.planId,
    modules: draft.moduleIds,
    businessName: draft.businessName,
    payerName: draft.payerName,
    email: draft.email,
  }
}

export function SignupForm({ initialPlan }: { initialPlan?: string }) {
  const urlPlan = parsePlanId(initialPlan)
  // sessionStorage draft wins over ?plan= when returning from checkout.
  // Fresh landing visits have no draft → URL plan applies.
  const storedDraft = useSyncExternalStore(
    subscribeDraftNoop,
    readClientDraft,
    () => null
  )
  const seed = fieldsFromDraft(storedDraft, urlPlan)
  const [local, setLocal] = useState<FormFields | null>(null)
  const fields = local ?? seed
  const { planId, modules, businessName, payerName, email } = fields
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // bfcache Back can restore in-memory password; product omits pass from draft.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) setPassword("")
    }
    window.addEventListener("pageshow", onPageShow)
    return () => window.removeEventListener("pageshow", onPageShow)
  }, [])

  useEffect(() => {
    if (!local) return
    saveSignupDraft({
      planId: local.planId,
      moduleIds: local.modules,
      businessName: local.businessName,
      payerName: local.payerName,
      email: local.email,
    })
  }, [local])

  const plan = PLAN_CATALOG.find((p) => p.id === planId)!

  const counter = cupoCounterLabel(planId, modules.length)
  const fullLocked = planId === "full"

  function patch(partial: Partial<FormFields>) {
    setLocal((prev) => ({ ...(prev ?? seed), ...partial }))
  }

  function onPlanChange(id: PlanId) {
    const base = local ?? seed
    setLocal({
      ...base,
      planId: id,
      modules: modulesAfterPlanChange(id, base.modules),
    })
  }

  function onToggleModule(id: string) {
    const base = local ?? seed
    setLocal({
      ...base,
      modules: toggleModuleSelection(planId, base.modules, id),
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    saveSignupDraft({
      planId,
      moduleIds: modules,
      businessName,
      payerName,
      email,
    })
    try {
      const res = await fetch("/api/signup/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          businessName,
          payerName,
          planId,
          moduleIds: modules,
        }),
      })
      let data: {
        error?: string
        redirectUrl?: string
        sessionId?: string
      } = {}
      try {
        data = (await res.json()) as typeof data
      } catch {
        /* empty / non-JSON body */
      }
      if (!res.ok) {
        setError(messageFromCheckoutHttp(res.status, data))
        return
      }
      if (data.redirectUrl) {
        window.location.assign(data.redirectUrl)
        return
      }
      setError("Respuesta sin redirect.")
    } catch {
      setError(NETWORK_ERROR_MESSAGE)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-lg flex-col gap-6 rounded-[24px] border border-[#262626] bg-[#0A0A0A] p-5 text-white md:max-w-2xl md:p-8"
    >
      <header className="flex flex-col gap-2">
        <p className="font-[family-name:var(--font-geist-mono)] text-xs tracking-wide text-[#C4B5FD]">
          Alta self-serve
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
          Crear cuenta Tumo
        </h1>
        <p className="text-sm text-[#A3A3A3]">
          Plan {plan.name} · {cupoLabelFor(planId) || `cupo ${plan.cupo}`} · Vas
          a pagar con Mercado Pago.
        </p>
      </header>

      <fieldset className="flex flex-col gap-3" data-plan-picker="true">
        <legend className="mb-1 text-sm font-medium text-[#A3A3A3]">Plan</legend>
        <div
          role="radiogroup"
          aria-label="Plan"
          className="grid gap-3 sm:grid-cols-3"
        >
          {PLAN_CATALOG.map((p) => {
            const selected = planId === p.id
            const highlighted = p.id === "pro"
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onPlanChange(p.id)}
                className={[
                  "relative flex min-h-[48px] flex-col items-start gap-1 rounded-[24px] border p-4 text-left transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7754E3]",
                  selected && highlighted
                    ? "border-[#7527E3] bg-gradient-to-br from-[#7754E3] to-[#5B35C9]"
                    : selected
                      ? "border-[#7754E3] bg-[#7754E318]"
                      : "border-[#262626] bg-[#111111] hover:border-[#333]",
                ].join(" ")}
              >
                {highlighted ? (
                  <span
                    className={[
                      "mb-1 inline-flex rounded-full px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] tracking-wide",
                      selected
                        ? "bg-[#FFFFFF22] text-white"
                        : "bg-[#7754E322] text-[#C4B5FD]",
                    ].join(" ")}
                  >
                    Más elegido
                  </span>
                ) : null}
                <span className="text-base font-extrabold tracking-tight">
                  {p.name}
                </span>
                <span
                  className={[
                    "text-xs",
                    selected && highlighted ? "text-[#EDE9FE]" : "text-[#A3A3A3]",
                  ].join(" ")}
                >
                  {cupoLabelFor(p.id)}
                </span>
                <span className="mt-1 text-lg font-extrabold tracking-tight">
                  ${priceUsd(p.id)}
                  <span className="ml-1 text-xs font-medium text-[#A3A3A3]">
                    USD/mes
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3" data-module-picker="true">
        <legend className="mb-1 w-full">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-[#A3A3A3]">Módulos</span>
            <span className="text-xs font-medium text-[#C4B5FD]">{counter}</span>
          </span>
        </legend>
        <div className="flex flex-col gap-2">
          {MODULE_OPTIONS.map((m) => {
            const selected = modules.includes(m.id)
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={selected}
                disabled={fullLocked}
                onClick={() => onToggleModule(m.id)}
                className={[
                  "flex min-h-[48px] w-full items-start gap-3 rounded-[24px] border p-4 text-left transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7754E3]",
                  selected
                    ? "border-[#7754E3] bg-[#7754E318]"
                    : "border-[#262626] bg-[#111111] hover:border-[#333]",
                  fullLocked ? "cursor-default opacity-95" : "",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className={[
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold",
                    selected
                      ? "border-[#7754E3] bg-[#7754E3] text-white"
                      : "border-[#444] bg-transparent text-transparent",
                  ].join(" ")}
                >
                  ✓
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold">{m.title}</span>
                    {fullLocked ? (
                      <span className="rounded-full bg-[#7754E322] px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] tracking-wide text-[#C4B5FD]">
                        incluido en Full
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm leading-snug text-[#A3A3A3]">
                    {m.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nombre del local
          <input
            required
            className="min-h-[48px] rounded-xl border border-[#333] bg-[#111] px-3"
            value={businessName}
            onChange={(e) => patch({ businessName: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tu nombre
          <input
            required
            className="min-h-[48px] rounded-xl border border-[#333] bg-[#111] px-3"
            value={payerName}
            onChange={(e) => patch({ payerName: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email (login)
          <input
            required
            type="email"
            className="min-h-[48px] rounded-xl border border-[#333] bg-[#111] px-3"
            value={email}
            onChange={(e) => patch({ email: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Contraseña
          <input
            required
            type="password"
            minLength={6}
            className="min-h-[48px] rounded-xl border border-[#333] bg-[#111] px-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || modules.length === 0}
        className="mt-1 min-h-[52px] rounded-full bg-[#7754E3] text-base font-bold text-white hover:bg-[#7527E3] disabled:opacity-60"
      >
        {busy ? "Creando…" : "Continuar al pago"}
      </button>
      <Link href="/" className="text-center text-sm text-[#A3A3A3] underline">
        Volver al inicio
      </Link>
    </form>
  )
}
