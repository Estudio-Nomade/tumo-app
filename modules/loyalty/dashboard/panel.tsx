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

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <h1 className="text-2xl font-bold">Fidelización</h1>

      <form onSubmit={search} className="flex flex-col gap-3">
        {codeMode ? (
          <Input
            label="Código de 4 dígitos"
            name="code"
            inputMode="numeric"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            required
          />
        ) : (
          <Input
            label="Buscar por código o WhatsApp"
            name="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
          />
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Buscando…" : "Buscar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCodeMode((v) => !v)
              setError("")
            }}
          >
            {codeMode ? "Buscar por WhatsApp" : "Ingresar código"}
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {toast ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {toast}
        </p>
      ) : null}

      {customer ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-semibold">{customer.name}</div>
          <div className="text-sm text-gray-500">
            {customer.phone} · código {customer.code}
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-sm text-gray-600">
              <span>
                {customer.purchases} / {customer.purchasesNeeded}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: "var(--color-primary, #F97316)",
                }}
              />
            </div>
          </div>
          <div className="mt-4">
            {customer.canRedeem ? (
              <Button
                type="button"
                disabled={acting}
                onClick={() => void redeem()}
                className="!bg-amber-500 !text-white"
              >
                {acting ? "Canjeando…" : `Canjear ${customer.rewardName}`}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={acting}
                onClick={() => void addVisit()}
                className="!bg-green-600 !text-white"
              >
                {acting ? "Sumando…" : "+1 visita"}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
