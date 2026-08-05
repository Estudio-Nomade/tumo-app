"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Gift,
  Keyboard,
  QrCode,
  Sandwich,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

export default function LoyaltyPanel({
  canEditProgram = false,
}: {
  canEditProgram?: boolean
} = {}) {
  const business = useBusiness()
  const searchParams = useSearchParams()
  const highlightFromUrl = searchParams.get("highlight")
  const [query, setQuery] = useState("")
  const [codeMode, setCodeMode] = useState(false)
  const [code, setCode] = useState("")
  const [customers, setCustomers] = useState<CustomerView[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")
  const [highlightId, setHighlightId] = useState<string | null>(
    highlightFromUrl
  )
  const [lookingUp, setLookingUp] = useState(false)
  const [redeemTarget, setRedeemTarget] = useState<CustomerView | null>(null)
  const [redeemError, setRedeemError] = useState("")
  const redeemInFlight = useRef(false)

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(""), 2500)
  }

  function upsertCustomer(customer: CustomerView) {
    setCustomers((prev) => {
      const rest = prev.filter((c) => c.id !== customer.id)
      return [customer, ...rest]
    })
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

  useEffect(() => {
    if (!highlightFromUrl || customers.length === 0) return
    const found = customers.find((c) => c.id === highlightFromUrl)
    if (!found) return
    setHighlightId(found.id)
    setQuery("")
    // Scroll highlighted row into view after paint
    window.requestAnimationFrame(() => {
      document
        .getElementById(`customer-row-${found.id}`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    })
  }, [highlightFromUrl, customers])

  const visible = useMemo(() => {
    const filtered = filterCustomers(customers, query)
    if (!highlightId) return filtered
    const hi = filtered.find((c) => c.id === highlightId)
    if (!hi) return filtered
    return [hi, ...filtered.filter((c) => c.id !== highlightId)]
  }, [customers, query, highlightId])

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

  async function confirmRedeem() {
    const target = redeemTarget
    if (!target || redeemInFlight.current) return
    redeemInFlight.current = true
    const id = target.id
    setActingId(id)
    setRedeemError("")
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
        setRedeemError(data.error ?? "No se pudo canjear. Probá de nuevo.")
        return
      }
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, purchases: 0, canRedeem: false } : c
        )
      )
      setRedeemTarget(null)
      showToast(`¡${target.rewardName} canjeado!`)
    } catch {
      setRedeemError("No se pudo canjear. Probá de nuevo.")
    } finally {
      redeemInFlight.current = false
      setActingId(null)
    }
  }

  async function submitCode() {
    const digits = code.replace(/\D/g, "").slice(0, 4)
    if (digits.length !== 4) {
      setError("Ingresá el código de 4 dígitos de la tarjeta del cliente")
      return
    }

    setLookingUp(true)
    setError("")
    try {
      const qs = new URLSearchParams({
        code: digits,
        slug: business.slug,
      })
      const res = await fetch(`/api/loyalty/customers?${qs.toString()}`)
      const data = (await res.json()) as CustomerView & { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Cliente no encontrado")
        setHighlightId(null)
        return
      }

      const found: CustomerView = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        code: data.code,
        purchases: data.purchases,
        purchasesNeeded: data.purchasesNeeded,
        rewardName: data.rewardName,
        canRedeem: Boolean(
          data.canRedeem ?? data.purchases >= data.purchasesNeeded
        ),
      }

      upsertCustomer(found)
      setQuery("")
      setHighlightId(found.id)
      setCodeMode(false)
      setCode("")
      showToast(`${found.name} · listo para sumar o canjear`)
    } catch {
      setError("No pudimos buscar el código. Probá de nuevo.")
    } finally {
      setLookingUp(false)
    }
  }

  return (
    <div className="relative mx-auto flex w-full flex-col gap-4 md:max-w-2xl">
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

      <div className="flex flex-col gap-2.5">
        {codeMode ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-primary,#F97316)] bg-white p-3 ring-2 ring-[var(--color-primary,#F97316)]/15">
            <label
              htmlFor="customer-code"
              className="text-xs font-semibold text-stone-500"
            >
              Código del cliente
            </label>
            <p className="text-[11px] leading-snug text-stone-400">
              El de 4 dígitos que ve el cliente en su tarjeta.
            </p>
            <div className="flex gap-2">
              <input
                id="customer-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void submitCode()
                  }
                }}
                placeholder="••••"
                className="h-[50px] min-w-0 flex-1 rounded-[14px] border-0 bg-[#F5F5F4] px-4 text-center text-lg font-bold tracking-[0.35em] text-stone-900 outline-none placeholder:tracking-normal placeholder:text-[#A8A29E] focus:ring-2 focus:ring-[var(--color-primary,#F97316)]/25"
                autoFocus
              />
              <button
                type="button"
                disabled={lookingUp || code.length !== 4}
                onClick={() => void submitCode()}
                className="h-[50px] shrink-0 rounded-[14px] bg-[var(--color-primary,#F97316)] px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {lookingUp ? "…" : "Buscar"}
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
            className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary,#F97316)] text-[15px] font-bold text-white"
          >
            <Keyboard size={18} strokeWidth={2} aria-hidden />
            Ingresar código
          </button>
        )}
        <Link
          href={`/${business.slug}/dashboard/loyalty/qr`}
          className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border border-[var(--color-primary,#F97316)] bg-white text-[15px] font-bold text-[var(--color-primary,#F97316)]"
        >
          <QrCode size={18} strokeWidth={2} aria-hidden />
          Mostrar QR del programa
        </Link>
        {canEditProgram ? (
          <Link
            href={`/${business.slug}/dashboard/loyalty/programa`}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[14px] text-sm font-semibold text-stone-600"
          >
            <SlidersHorizontal size={16} strokeWidth={2} aria-hidden />
            Configurar programa
          </Link>
        ) : null}
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
            <li className="flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-2xl bg-[#F5F5F4] px-6 py-8 text-center">
              <p className="text-sm text-stone-500">
                Todavía no hay clientes. Mostrá el QR para que se registren.
              </p>
              <Link
                href={`/${business.slug}/dashboard/loyalty/qr`}
                className="text-sm font-bold text-[var(--color-primary,#F97316)]"
              >
                Abrir QR del programa
              </Link>
            </li>
          ) : visible.length === 0 ? (
            <li className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl bg-[#F5F5F4] px-6 py-8 text-center text-sm text-stone-500">
              <p>No se encontraron clientes.</p>
              <p className="text-xs text-stone-400">
                Probá con el código de 4 dígitos de la tarjeta.
              </p>
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
                  id={`customer-row-${customer.id}`}
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
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="truncate text-sm font-semibold text-stone-900">
                      {customer.name}
                    </div>
                    <span className="text-xs font-semibold text-stone-500">
                      {customer.purchases}/{customer.purchasesNeeded}
                    </span>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F5F5F4]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary,#F97316)] transition-all duration-500 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {customer.canRedeem ? (
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => {
                        setRedeemError("")
                        setRedeemTarget(customer)
                      }}
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
                      {acting ? "…" : "+1 compra"}
                    </button>
                  )}
                </li>
              )
            })
          )}
        </ul>
      )}

      <Dialog
        open={redeemTarget !== null}
        onOpenChange={(open) => {
          if (!open && !redeemInFlight.current) {
            setRedeemTarget(null)
            setRedeemError("")
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden p-0 sm:max-w-sm"
        >
          <DialogHeader className="gap-3 p-5 pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF9C3] text-[#A16207]">
              <Gift size={24} strokeWidth={2.25} aria-hidden />
            </div>
            <DialogTitle className="text-lg font-bold text-stone-900">
              Confirmar canje
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-stone-500">
              {redeemTarget ? (
                <>
                  ¿Canjear{" "}
                  <span className="font-semibold text-stone-800">
                    {redeemTarget.rewardName}
                  </span>{" "}
                  a{" "}
                  <span className="font-semibold text-stone-800">
                    {redeemTarget.name}
                  </span>
                  ? Se reinicia su progreso de visitas.
                </>
              ) : (
                "\u00a0"
              )}
            </DialogDescription>
            {redeemError ? (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
              >
                {redeemError}
              </p>
            ) : null}
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 flex-col-reverse gap-2 rounded-b-xl border-t border-stone-100 bg-stone-50 p-4 sm:flex-col-reverse sm:justify-stretch">
            <Button
              type="button"
              disabled={actingId !== null}
              onClick={() => void confirmRedeem()}
              className="h-11 w-full rounded-xl bg-[#EAB308] text-sm font-bold text-white hover:bg-[#CA8A04]"
            >
              {actingId !== null ? "Canjeando…" : "Sí, canjear premio"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={actingId !== null}
              onClick={() => {
                setRedeemTarget(null)
                setRedeemError("")
              }}
              className="h-11 w-full rounded-xl border-stone-200 bg-white text-sm font-semibold text-stone-700"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
