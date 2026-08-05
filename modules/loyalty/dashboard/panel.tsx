"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Gift, Keyboard, Sandwich, Search } from "lucide-react"
import { useBusiness } from "@/shell/context/business"

export type CustomerView = {
  id: string
  name: string
  phone: string
  code: string
  purchases: number
  purchasesNeeded: number
  rewardName: string
  canRedeem: boolean
}

export const AVATAR_COLORS = [
  "#FFF7ED",
  "#FEF9C3",
  "#F5F5F4",
  "#EFF6FF",
] as const

export function filterCustomers(
  customers: CustomerView[],
  query: string
): CustomerView[] {
  const q = query.trim().toLowerCase()
  if (!q) return customers
  return customers.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.code.includes(q)
  )
}

export function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0][0]!.toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export default function LoyaltyPanel() {
  const business = useBusiness()
  const [query, setQuery] = useState("")
  const [codeMode, setCodeMode] = useState(false)
  const [code, setCode] = useState("")
  const [customers, setCustomers] = useState<CustomerView[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")
  const [highlightId, setHighlightId] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(""), 2500)
  }

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/loyalty/customers?list=1&limit=100")
      const data = (await res.json()) as {
        customers?: CustomerView[]
        error?: string
      }
      if (!res.ok) {
        setError(data.error ?? "No se pudieron cargar los clientes.")
        setCustomers([])
        return
      }
      setCustomers(Array.isArray(data.customers) ? data.customers : [])
    } catch {
      setError("No se pudieron cargar los clientes.")
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  const visible = useMemo(
    () => filterCustomers(customers, query),
    [customers, query]
  )

  async function addVisit(id: string) {
    setActingId(id)
    setError("")
    try {
      const res = await fetch("/api/loyalty/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: id }),
      })
      const data = (await res.json()) as CustomerView & { error?: string }
      if (!res.ok) {
        setError(data.error ?? "No se pudo sumar la visita.")
        return
      }
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                ...data,
                canRedeem: Boolean(
                  data.canRedeem ?? data.purchases >= data.purchasesNeeded
                ),
              }
            : c
        )
      )
      showToast("¡Visita sumada!")
    } catch {
      setError("No se pudo sumar la visita.")
    } finally {
      setActingId(null)
    }
  }

  async function redeem(id: string) {
    const target = customers.find((c) => c.id === id)
    if (!target) return
    setActingId(id)
    setError("")
    try {
      const res = await fetch("/api/loyalty/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: id }),
      })
      const data = (await res.json()) as {
        success?: boolean
        error?: string
      }
      if (!res.ok) {
        setError(data.error ?? "No se pudo canjear.")
        return
      }
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, purchases: 0, canRedeem: false } : c
        )
      )
      showToast(`¡${target.rewardName} canjeado!`)
    } catch {
      setError("No se pudo canjear.")
    } finally {
      setActingId(null)
    }
  }

  function submitCode() {
    const digits = code.replace(/\D/g, "").slice(0, 4)
    if (digits.length !== 4) {
      setError("Ingresá un código de 4 dígitos")
      return
    }
    const found = customers.find((c) => c.code === digits)
    if (!found) {
      setError("Cliente no encontrado")
      setHighlightId(null)
      return
    }
    setError("")
    setQuery(found.name)
    setHighlightId(found.id)
    setCodeMode(false)
    setCode("")
    showToast(`Encontramos a ${found.name}`)
  }

  return (
    <div className="relative mx-auto flex w-full max-w-lg flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-0.5">
          <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
            Clientes
          </h1>
          <p className="truncate text-xs text-stone-500">
            {business.name} · Hoy
          </p>
        </div>
        <div
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-primary,#F97316)] text-white"
        >
          <Sandwich size={22} strokeWidth={2} />
        </div>
      </header>

      <div className="relative">
        <Search
          size={18}
          strokeWidth={2}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#A8A29E]"
        />
        <input
          type="search"
          name="query"
          aria-label="Buscar por nombre o teléfono"
          placeholder="Buscar por nombre o teléfono"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlightId(null)
          }}
          className="h-[50px] w-full rounded-[14px] border-0 bg-[#F5F5F4] pr-4 pl-11 text-sm text-stone-900 outline-none placeholder:text-[#A8A29E] focus:ring-2 focus:ring-[var(--color-primary,#F97316)]/25"
        />
      </div>

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

      {loading ? (
        <div className="flex min-h-[180px] items-center justify-center rounded-2xl bg-[#F5F5F4] px-6 py-8 text-center">
          <p className="text-sm font-medium text-stone-500">Cargando…</p>
        </div>
      ) : (
        <ul className="flex max-h-[min(52vh,420px)] flex-col gap-2.5 overflow-y-auto">
          {customers.length === 0 ? (
            <li className="flex min-h-[120px] items-center justify-center rounded-2xl bg-[#F5F5F4] px-6 py-8 text-center text-sm text-stone-500">
              Todavía no hay clientes registrados.
            </li>
          ) : visible.length === 0 ? (
            <li className="flex min-h-[120px] items-center justify-center rounded-2xl bg-[#F5F5F4] px-6 py-8 text-center text-sm text-stone-500">
              No se encontraron clientes.
            </li>
          ) : (
            visible.map((customer, index) => {
              const pct =
                customer.purchasesNeeded > 0
                  ? Math.min(
                      (customer.purchases / customer.purchasesNeeded) * 100,
                      100
                    )
                  : 0
              const bg = AVATAR_COLORS[index % AVATAR_COLORS.length]
              const acting = actingId === customer.id
              const highlighted = highlightId === customer.id

              return (
                <li
                  key={customer.id}
                  className={`flex items-center gap-3 rounded-2xl border bg-white p-3 ${
                    highlighted
                      ? "border-[var(--color-primary,#F97316)] ring-2 ring-[var(--color-primary,#F97316)]/20"
                      : "border-[#E7E5E4]"
                  }`}
                >
                  <div
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[var(--color-primary,#F97316)]"
                    style={{ backgroundColor: bg }}
                  >
                    {customerInitials(customer.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-stone-900">
                      {customer.name}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 w-[88px] shrink-0 overflow-hidden rounded-full bg-[#F5F5F4]">
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
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => void redeem(customer.id)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#EAB308] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-70"
                    >
                      <Gift size={14} strokeWidth={2.5} aria-hidden />
                      Canjear premio
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => void addVisit(customer.id)}
                      className="shrink-0 rounded-full bg-[#16A34A] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-70"
                    >
                      +1 compra
                    </button>
                  )}
                </li>
              )
            })
          )}
        </ul>
      )}

      {codeMode ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-[#E7E5E4] bg-white p-3">
          <label className="text-xs font-semibold text-stone-500">
            Código de 4 dígitos
          </label>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="••••"
              className="h-[50px] min-w-0 flex-1 rounded-[14px] border-0 bg-[#F5F5F4] px-4 text-center text-lg font-bold tracking-[0.35em] text-stone-900 outline-none placeholder:tracking-normal placeholder:text-[#A8A29E] focus:ring-2 focus:ring-[var(--color-primary,#F97316)]/25"
              autoFocus
            />
            <button
              type="button"
              onClick={submitCode}
              className="h-[50px] shrink-0 rounded-[14px] bg-[var(--color-primary,#F97316)] px-4 text-sm font-bold text-white"
            >
              OK
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setCodeMode(false)
              setCode("")
              setError("")
            }}
            className="text-xs font-semibold text-stone-500"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setCodeMode(true)
            setError("")
          }}
          className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border border-[var(--color-primary,#F97316)] bg-white text-[15px] font-bold text-[var(--color-primary,#F97316)]"
        >
          <Keyboard size={18} strokeWidth={2} aria-hidden />
          Ingresar código
        </button>
      )}
    </div>
  )
}
