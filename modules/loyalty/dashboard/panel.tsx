"use client"

import { FormEvent, useState } from "react"
import { useParams } from "next/navigation"
import Button from "@/shell/ui/Button"
import Input from "@/shell/ui/Input"

type CustomerView = {
  id: string
  name: string
  phone: string
  code: string
  purchases: number
  purchasesNeeded: number
  rewardName: string
  canRedeem: boolean
}

const inputClassName =
  "h-12 !rounded-2xl !border-stone-200 !bg-stone-50 px-4 text-base text-stone-900 placeholder:text-stone-400 focus:!border-[var(--color-primary,#F97316)] focus:!ring-2 focus:!ring-[var(--color-primary,#F97316)]/25"

export default function LoyaltyPanel() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const [query, setQuery] = useState("")
  const [codeMode, setCodeMode] = useState(false)
  const [code, setCode] = useState("")
  const [customer, setCustomer] = useState<CustomerView | null>(null)
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(""), 2500)
  }

  async function search(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setCustomer(null)
    try {
      const qs = new URLSearchParams({ slug })
      if (codeMode) qs.set("code", code)
      else {
        if (/^\d{4}$/.test(query.trim())) qs.set("code", query.trim())
        else qs.set("phone", query.trim())
      }
      const res = await fetch(`/api/loyalty/customers?${qs.toString()}`)
      const data = (await res.json()) as CustomerView & { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Cliente no encontrado")
        return
      }
      setCustomer({
        ...data,
        canRedeem: data.canRedeem ?? data.purchases >= data.purchasesNeeded,
      })
    } catch {
      setError("No pudimos buscar. Probá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  async function addVisit() {
    if (!customer) return
    setActing(true)
    setError("")
    try {
      const res = await fetch("/api/loyalty/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id }),
      })
      const data = (await res.json()) as CustomerView & { error?: string }
      if (!res.ok) {
        setError(data.error ?? "No se pudo sumar la visita.")
        return
      }
      setCustomer({
        ...customer,
        ...data,
        canRedeem: Boolean(data.canRedeem),
      })
      showToast("¡Visita sumada!")
    } catch {
      setError("No se pudo sumar la visita.")
    } finally {
      setActing(false)
    }
  }

  async function redeem() {
    if (!customer) return
    setActing(true)
    setError("")
    try {
      const res = await fetch("/api/loyalty/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id }),
      })
      const data = (await res.json()) as {
        success?: boolean
        purchases?: number
        error?: string
      }
      if (!res.ok) {
        setError(data.error ?? "No se pudo canjear.")
        return
      }
      setCustomer({
        ...customer,
        purchases: 0,
        canRedeem: false,
      })
      showToast(`¡${customer.rewardName} canjeado!`)
    } catch {
      setError("No se pudo canjear.")
    } finally {
      setActing(false)
    }
  }

  const pct =
    customer && customer.purchasesNeeded > 0
      ? Math.min(
          (customer.purchases / customer.purchasesNeeded) * 100,
          100
        )
      : 0

  const customerInitial = (customer?.name?.trim()?.[0] ?? "C").toUpperCase()

  return (
    <div className="relative mx-auto flex w-full max-w-lg flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Fidelización
        </h1>
        <p className="text-sm text-stone-500">
          Buscá un cliente para sumar visitas o canjear premios.
        </p>
      </header>

      <form
        onSubmit={search}
        className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
      >
        {codeMode ? (
          <Input
            label="Código de 4 dígitos"
            name="code"
            inputMode="numeric"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            required
            className={inputClassName}
          />
        ) : (
          <Input
            label="Buscar por código o WhatsApp"
            name="query"
            placeholder="Código o número de WhatsApp"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
            className={inputClassName}
          />
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="submit"
            disabled={loading}
            className="h-12 flex-1 !rounded-2xl text-sm font-bold disabled:opacity-70"
          >
            {loading ? "Buscando…" : "Buscar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCodeMode((v) => !v)
              setError("")
            }}
            className="h-12 flex-1 !rounded-2xl text-sm font-bold"
          >
            {codeMode ? "Buscar por WhatsApp" : "Ingresar código"}
          </Button>
        </div>
      </form>

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}

      {toast ? (
        <p
          role="status"
          className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800 shadow-sm ring-1 ring-green-600/10 transition duration-300 ease-out"
        >
          {toast}
        </p>
      ) : null}

      {loading && !customer ? (
        <div className="flex min-h-[140px] items-center justify-center rounded-2xl bg-stone-100 px-6 py-8 text-center">
          <p className="text-sm font-medium text-stone-500">Buscando…</p>
        </div>
      ) : null}

      {customer ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary,#F97316)_14%,white)] text-sm font-bold text-[var(--color-primary,#F97316)]"
            >
              {customerInitial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-semibold text-stone-900">
                {customer.name}
              </div>
              <div className="truncate text-sm text-stone-500">
                {customer.phone}
              </div>
              <div className="mt-1 text-xs font-semibold tracking-widest text-stone-400 uppercase">
                Código {customer.code}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-sm text-stone-600">
              <span>
                {customer.purchases} / {customer.purchasesNeeded}
              </span>
              <span className="font-medium text-stone-500">
                {Math.round(pct)}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  background: "var(--color-primary, #F97316)",
                }}
              />
            </div>
          </div>

          <div className="mt-5">
            {customer.canRedeem ? (
              <Button
                type="button"
                disabled={acting}
                onClick={() => void redeem()}
                className="h-12 w-full !rounded-2xl !border-0 !bg-amber-500 text-sm font-bold !text-white disabled:opacity-70"
              >
                {acting ? "Canjeando…" : `Canjear ${customer.rewardName}`}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={acting}
                onClick={() => void addVisit()}
                className="h-12 w-full !rounded-2xl !border-0 !bg-green-600 text-sm font-bold !text-white disabled:opacity-70"
              >
                {acting ? "Sumando…" : "+1 visita"}
              </Button>
            )}
          </div>
        </div>
      ) : !loading && !error ? (
        <div className="flex min-h-[140px] items-center justify-center rounded-2xl bg-stone-100 px-6 py-8 text-center">
          <p className="max-w-xs text-sm leading-relaxed text-stone-500">
            Buscá por código o WhatsApp para ver la tarjeta del cliente y sumar
            visitas.
          </p>
        </div>
      ) : null}
    </div>
  )
}
