"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { PLAN_CATALOG, type PlanId } from "@/shell/billing/plan-catalog"

const MODULES = [
  { id: "loyalty", label: "Fidelización" },
  { id: "orders", label: "Pedidos" },
  { id: "turnos", label: "Turnos" },
] as const

export function SignupForm({ initialPlan }: { initialPlan?: string }) {
  const defaultPlan =
    initialPlan === "basico" || initialPlan === "pro" || initialPlan === "full"
      ? initialPlan
      : "basico"

  const [planId, setPlanId] = useState<PlanId>(defaultPlan)
  const [modules, setModules] = useState<string[]>(
    defaultPlan === "full"
      ? MODULES.map((m) => m.id)
      : defaultPlan === "pro"
        ? ["loyalty", "orders"]
        : ["loyalty"]
  )
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [payerName, setPayerName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const plan = useMemo(
    () => PLAN_CATALOG.find((p) => p.id === planId)!,
    [planId]
  )

  function onPlanChange(id: PlanId) {
    setPlanId(id)
    if (id === "full") setModules(MODULES.map((m) => m.id))
    else if (id === "basico") setModules((m) => (m[0] ? [m[0]] : ["loyalty"]))
    else if (id === "pro")
      setModules((m) =>
        m.length ? m.slice(0, 3) : ["loyalty", "orders"]
      )
  }

  function toggleModule(id: string) {
    if (planId === "full") return
    setModules((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (planId === "basico") return [id]
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
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
      const data = (await res.json()) as {
        error?: string
        redirectUrl?: string
        sessionId?: string
      }
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar el checkout.")
        return
      }
      if (data.redirectUrl) {
        window.location.assign(data.redirectUrl)
        return
      }
      setError("Respuesta sin redirect.")
    } catch {
      setError("Error de red. Reintentá.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-[#262626] bg-[#0A0A0A] p-6 text-white"
    >
      <h1 className="text-2xl font-extrabold tracking-tight">Crear cuenta Tumo</h1>
      <p className="text-sm text-[#A3A3A3]">
        Plan {plan.name} · cupo {plan.cupo === Number.POSITIVE_INFINITY ? "todos" : plan.cupo} ·
        cobro demo local (fake MP).
      </p>

      <label className="flex flex-col gap-1 text-sm">
        Plan
        <select
          className="min-h-[48px] rounded-xl border border-[#333] bg-[#111] px-3"
          value={planId}
          onChange={(e) => onPlanChange(e.target.value as PlanId)}
        >
          {PLAN_CATALOG.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — U$S {(p.amountUsdCentsMonth / 100).toFixed(2)}/mes
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-[#A3A3A3]">Módulos</legend>
        {MODULES.map((m) => (
          <label key={m.id} className="flex min-h-[48px] items-center gap-3 text-base">
            <input
              type="checkbox"
              checked={modules.includes(m.id)}
              disabled={planId === "full"}
              onChange={() => toggleModule(m.id)}
              className="size-5"
            />
            {m.label}
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        Nombre del local
        <input
          required
          className="min-h-[48px] rounded-xl border border-[#333] bg-[#111] px-3"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Tu nombre
        <input
          required
          className="min-h-[48px] rounded-xl border border-[#333] bg-[#111] px-3"
          value={payerName}
          onChange={(e) => setPayerName(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Email (login)
        <input
          required
          type="email"
          className="min-h-[48px] rounded-xl border border-[#333] bg-[#111] px-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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

      {error ? (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-2 min-h-[52px] rounded-full bg-[#7754E3] text-base font-bold text-white disabled:opacity-60"
      >
        {busy ? "Creando…" : "Continuar al pago"}
      </button>
      <Link href="/" className="text-center text-sm text-[#A3A3A3] underline">
        Volver al inicio
      </Link>
    </form>
  )
}
