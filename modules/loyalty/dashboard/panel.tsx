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
  "h-[50px] !rounded-[14px] !border-0 !bg-[#F5F5F4] px-4 text-sm text-stone-900 placeholder:text-[#A8A29E] focus:!ring-2 focus:!ring-[var(--color-primary,#F97316)]/25"

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
    <div className="relative mx-auto flex w-full max-w-lg flex-col gap-4">
      <header className="flex flex-col gap-0.5">
        <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
          Clientes
        </h1>
        <p className="text-xs text-stone-500">Buscá y sumá compras</p>
      </header>

      <form onSubmit={search} className="flex flex-col gap-3">
        {codeMode ? (
          <div className="[&_label>span]:sr-only">
            <Input
              label="Código de 4 dígitos"
              name="code"
              inputMode="numeric"
              maxLength={4}
              placeholder="Código de 4 dígitos"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              required
              className={inputClassName}
            />
          </div>
        ) : (
          <div className="[&_label>span]:sr-only">
            <Input
              label="Buscar por nombre o teléfono"
              name="query"
              placeholder="Buscar por nombre o teléfono"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
              className={inputClassName}
            />
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="submit"
            disabled={loading}
            className="h-[50px] flex-1 !rounded-[14px] text-sm font-bold disabled:opacity-70"
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
            className="h-[50px] flex-1 !rounded-[14px] !border-[var(--color-primary,#F97316)] text-sm font-bold"
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
        <div className="flex min-h-[140px] items-center justify-center rounded-2xl bg-[#F5F5F4] px-6 py-8 text-center">
          <p className="text-sm font-medium text-stone-500">Buscando…</p>
        </div>
      ) : null}

      {customer ? (
        <div className="flex items-center gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-3">
          <div
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF7ED] text-sm font-bold text-[var(--color-primary,#F97316)]"
          >
            {customerInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-stone-900">
              {customer.name}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#F5F5F4]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary,#F97316)] transition-all duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-[#A8A29E]">
                {customer.purchases}/{customer.purchasesNeeded}
              </span>
            </div>
          </div>
          {customer.canRedeem ? (
            <Button
              type="button"
              disabled={acting}
              onClick={() => void redeem()}
              className="shrink-0 !rounded-full !border-0 !bg-[#EAB308] px-3 py-2.5 text-xs font-bold !text-white disabled:opacity-70"
            >
              {acting ? "…" : "Canjear"}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={acting}
              onClick={() => void addVisit()}
              className="shrink-0 !rounded-full !border-0 !bg-[#16A34A] px-3 py-2.5 text-xs font-bold !text-white disabled:opacity-70"
            >
              {acting ? "…" : "+1 compra"}
            </Button>
          )}
        </div>
      ) : !loading && !error ? (
        <div className="flex min-h-[140px] items-center justify-center rounded-2xl bg-[#F5F5F4] px-6 py-8 text-center">
          <p className="max-w-xs text-sm leading-relaxed text-stone-500">
            Buscá por código o WhatsApp para ver la tarjeta del cliente y sumar
            visitas.
          </p>
        </div>
      ) : null}
    </div>
  )
}
