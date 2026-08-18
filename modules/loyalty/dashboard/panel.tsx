"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Gift,
  Keyboard,
  QrCode,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { useBusiness } from "@/shell/context/business"
import type { PointRange } from "@/modules/loyalty/lib/types"
import LoyaltyScanner from "@/modules/loyalty/dashboard/loyalty-scanner"
import CustomerActionSheet, {
  type SheetCustomer,
} from "@/modules/loyalty/dashboard/customer-action-sheet"

export type CustomerView = {
  id: string
  name: string
  phone: string
  code: string
  points: number
  pointsNeeded: number
  rewardName: string
  canRedeem: boolean
  pointRanges?: PointRange[]
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

function normalizeCustomer(
  data: Partial<CustomerView> & { id: string; name: string }
): CustomerView {
  const points = Number(data.points ?? 0)
  const pointsNeeded = Number(data.pointsNeeded ?? 0)
  return {
    id: data.id,
    name: data.name,
    phone: data.phone ?? "",
    code: data.code ?? "",
    points,
    pointsNeeded,
    rewardName: data.rewardName ?? "",
    canRedeem: Boolean(data.canRedeem ?? points >= pointsNeeded),
    pointRanges: data.pointRanges,
  }
}

export default function LoyaltyPanel({
  canEditProgram = false,
}: {
  canEditProgram?: boolean
} = {}) {
  const business = useBusiness()
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get("c")
  const highlightFromUrl = searchParams.get("highlight")

  const [mode, setMode] = useState<"scan" | "list">("scan")
  const [query, setQuery] = useState("")
  const [codeMode, setCodeMode] = useState(false)
  const [code, setCode] = useState("")
  const [customers, setCustomers] = useState<CustomerView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")
  const [highlightId, setHighlightId] = useState<string | null>(
    highlightFromUrl
  )
  const [lookingUp, setLookingUp] = useState(false)
  const [sheetCustomer, setSheetCustomer] = useState<SheetCustomer | null>(
    null
  )
  const [sheetOpen, setSheetOpen] = useState(false)

  const ranges: PointRange[] = useMemo(() => {
    if (sheetCustomer?.pointRanges?.length) return sheetCustomer.pointRanges
    return (business.point_ranges ?? []) as PointRange[]
  }, [business.point_ranges, sheetCustomer?.pointRanges])

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

  const openSheetFor = useCallback((customer: CustomerView) => {
    setSheetCustomer(customer)
    setSheetOpen(true)
  }, [])

  const lookupByCode = useCallback(
    async (digits: string, openSheet = true) => {
      setLookingUp(true)
      setError("")
      try {
        const qs = new URLSearchParams({ code: digits, slug: business.slug })
        const res = await fetch(`/api/loyalty/customers?${qs.toString()}`)
        const data = (await res.json()) as CustomerView & { error?: string }
        if (!res.ok) {
          setError(data.error ?? "Cliente no encontrado")
          return null
        }
        const found = normalizeCustomer(data)
        upsertCustomer(found)
        setHighlightId(found.id)
        if (openSheet) openSheetFor(found)
        return found
      } catch {
        setError("No pudimos buscar el código. Probá de nuevo.")
        return null
      } finally {
        setLookingUp(false)
      }
    },
    [business.slug, openSheetFor]
  )

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
      const list = Array.isArray(data.customers)
        ? data.customers.map((c) => normalizeCustomer(c))
        : []
      setCustomers(list)
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
    if (!codeFromUrl || codeFromUrl.length !== 4) return
    void lookupByCode(codeFromUrl, true)
  }, [codeFromUrl, lookupByCode])

  const visible = useMemo(() => {
    const filtered = filterCustomers(customers, query)
    if (!highlightId) return filtered
    const hi = filtered.find((c) => c.id === highlightId)
    if (!hi) return filtered
    return [hi, ...filtered.filter((c) => c.id !== highlightId)]
  }, [customers, query, highlightId])

  async function submitCode() {
    const digits = code.replace(/\D/g, "").slice(0, 4)
    if (digits.length !== 4) {
      setError("Ingresá el código de 4 dígitos de la tarjeta del cliente")
      return
    }
    const found = await lookupByCode(digits, true)
    if (found) {
      setCodeMode(false)
      setCode("")
      setMode("scan")
    }
  }

  function renderCustomerRow(customer: CustomerView, index: number) {
    const pct =
      customer.pointsNeeded > 0
        ? Math.min((customer.points / customer.pointsNeeded) * 100, 100)
        : 0
    const bg = AVATAR_COLORS[index % AVATAR_COLORS.length]
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
        <button
          type="button"
          onClick={() => openSheetFor(customer)}
          className="flex min-w-0 flex-1 flex-col gap-1 text-left"
        >
          <div className="truncate text-base font-semibold text-stone-900">
            {customer.name}
          </div>
          <span className="text-sm font-semibold text-stone-600">
            {customer.points}/{customer.pointsNeeded} pts
          </span>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F5F5F4]">
            <div
              className="h-full rounded-full bg-[var(--color-primary,#F97316)] transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </button>
        {customer.canRedeem ? (
          <button
            type="button"
            onClick={() => openSheetFor(customer)}
            className="inline-flex min-h-[48px] shrink-0 items-center gap-1 rounded-full bg-[#EAB308] px-3 py-2.5 text-sm font-bold text-white"
          >
            <Gift size={14} strokeWidth={2.5} aria-hidden />
            Canjear
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openSheetFor(customer)}
            className="min-h-[48px] shrink-0 rounded-full bg-[#16A34A] px-3 py-2.5 text-sm font-bold text-white"
          >
            Sumar
          </button>
        )}
      </li>
    )
  }

  return (
    <div className="relative mx-auto flex w-full flex-col gap-4 md:max-w-2xl">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-0.5">
          <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
            {mode === "scan" ? "Escanear" : "Clientes"}
          </h1>
          <p className="truncate text-base text-stone-700">
            {business.name} · Hoy
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={`/${business.slug}/dashboard/loyalty/numeros`}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl px-3 text-base font-semibold text-[var(--color-primary,#F97316)]"
          >
            Cómo va
          </Link>
          <Link
            href={`/${business.slug}/dashboard/loyalty/qr`}
            className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-1.5 rounded-xl border border-[var(--color-primary,#F97316)] px-3 text-base font-semibold text-[var(--color-primary,#F97316)]"
          >
            <QrCode size={20} strokeWidth={2} aria-hidden />
            QR
          </Link>
        </div>
      </header>

      {mode === "scan" ? (
        <div className="flex flex-col gap-3">
          <LoyaltyScanner
            slug={business.slug}
            paused={sheetOpen || lookingUp}
            onCustomerCode={(c) => void lookupByCode(c, true)}
          />
          <button
            type="button"
            onClick={() => {
              setCodeMode(true)
              setMode("list")
            }}
            className="text-center text-sm font-semibold text-[var(--color-primary,#F97316)]"
          >
            ¿No funciona el QR?
          </button>
          <button
            type="button"
            onClick={() => setMode("list")}
            className="text-center text-xs font-medium text-stone-500"
          >
            Ver lista de clientes
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              setMode("scan")
              setCodeMode(false)
            }}
            className="text-left text-sm font-semibold text-[var(--color-primary,#F97316)]"
          >
            ← Volver al scanner
          </button>

          <div className="relative sticky top-0 z-10 bg-[#FAFAF9] py-1">
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
              className="h-[52px] w-full rounded-[14px] border-0 bg-[#F5F5F4] pr-4 pl-11 text-base text-stone-900 outline-none placeholder:text-stone-500 focus:ring-2 focus:ring-[var(--color-primary,#F97316)]/25"
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
                <div className="flex gap-2">
                  <input
                    id="customer-code"
                    inputMode="numeric"
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
                    className="h-[50px] min-w-0 flex-1 rounded-[14px] border-0 bg-[#F5F5F4] px-4 text-center text-lg font-bold tracking-[0.35em] text-stone-900 outline-none"
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
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCodeMode(true)}
                className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary,#F97316)] text-[15px] font-bold text-white"
              >
                <Keyboard size={18} strokeWidth={2} aria-hidden />
                Ingresar código
              </button>
            )}
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

          {loading ? (
            <p className="text-center text-stone-600">Cargando…</p>
          ) : (
            <ul className="flex max-h-[min(52vh,420px)] flex-col gap-2.5 overflow-y-auto">
              {visible.map((c, i) => renderCustomerRow(c, i))}
            </ul>
          )}
        </>
      )}

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
          className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800"
        >
          {toast}
        </p>
      ) : null}

      <CustomerActionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        customer={sheetCustomer}
        ranges={ranges}
        onToast={showToast}
        onEarned={(c) => {
          const next = normalizeCustomer(c)
          upsertCustomer(next)
          setSheetCustomer(next)
        }}
        onRedeemed={(id) => {
          setCustomers((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, points: 0, canRedeem: false } : c
            )
          )
          setSheetCustomer((prev) =>
            prev && prev.id === id
              ? { ...prev, points: 0, canRedeem: false }
              : prev
          )
        }}
      />
    </div>
  )
}
