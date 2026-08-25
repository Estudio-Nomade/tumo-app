"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useBusiness } from "@/shell/context/business"
import { formatCents } from "@/modules/orders/lib/types"
import {
  createOrdersChannel,
  isNewOrder,
  newOrderToastMessage,
} from "@/modules/orders/lib/realtime"

type OrderRow = {
  id: string
  orderNumber: number
  status: string
  paymentStatus: string
  paymentMethod: string
  totalCents: number
  createdAt: number
  customerName: string
  itemsSummary: string
}

type ChipId = "new" | "preparing" | "ready" | "completed" | "all"

const CHIPS: { id: ChipId; label: string }[] = [
  { id: "new", label: "Nuevos" },
  { id: "preparing", label: "En preparación" },
  { id: "ready", label: "Listos" },
  { id: "completed", label: "Entregados" },
  { id: "all", label: "Todos" },
]

function paymentLabel(method: string, status: string): string {
  if (status === "paid") return "Pagado"
  if (status === "rejected") return "Pago rechazado"
  if (method === "transfer" && status === "pending_receipt") return "Falta comprobante"
  if (method === "transfer" && status === "pending_verification") return "Revisar comprobante"
  if (method === "mercadopago" && status === "pending") return "Pago en proceso"
  if (method === "at_pickup") return "Paga al retirar"
  return "Pagado"
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.max(1, Math.floor(diff / 60000))
  if (min < 60) return `hace ${min} min`
  return `hace ${Math.floor(min / 60)} h`
}

export default function OrdersPanel({ slug }: { slug: string }) {
  const business = useBusiness()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<ChipId>("new")
  const [retry, setRetry] = useState(0)
  const [paused, setPaused] = useState(false)
  const [toast, setToast] = useState("")

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(""), 2500)
  }

  function loadSilent() {
    return fetch(`/api/orders?status=${filter}`)
      .then((res) => res.json())
      .then((data: { orders?: OrderRow[]; error?: string }) => {
        if (data.error) {
          setError(data.error)
          setOrders([])
        } else {
          setOrders(Array.isArray(data.orders) ? data.orders : [])
        }
      })
      .catch(() => setError("No se pudieron cargar los pedidos."))
  }

  useEffect(() => {
    let cancelled = false
    fetch(`/api/orders?status=${filter}`)
      .then((res) => res.json())
      .then((data: { orders?: OrderRow[]; error?: string }) => {
        if (cancelled) return
        if (data.error) {
          setError(data.error)
          setOrders([])
        } else {
          setOrders(Array.isArray(data.orders) ? data.orders : [])
        }
      })
      .catch(() => {
        if (!cancelled) setError("No se pudieron cargar los pedidos.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filter, retry])

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void loadSilent()
    }, 20000)
    const onFocus = () => void loadSilent()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(id)
      window.removeEventListener("focus", onFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  useEffect(() => {
    const channel = createOrdersChannel({
      name: "orders-panel",
      event: "*",
      filter: `business_id=eq.${business.id}`,
      onChange: (change) => {
        if (isNewOrder(change) && change.orderNumber != null) {
          showToast(newOrderToastMessage(change.orderNumber))
        }
        void loadSilent()
      },
    })
    return () => channel.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id, filter])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/orders/catalog?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((json: { settings?: { isPaused?: boolean } }) => {
        if (!cancelled) setPaused(Boolean(json.settings?.isPaused))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [slug])

  const toReview = orders.filter(
    (o) => o.paymentMethod === "transfer" && o.paymentStatus === "pending_verification"
  )

  function selectFilter(id: ChipId) {
    setFilter(id)
    setLoading(true)
    setError("")
  }

  async function togglePaused() {
    const next = !paused
    setPaused(next)
    try {
      const res = await fetch("/api/orders/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaused: next }),
      })
      if (!res.ok) {
        setPaused(!next)
        showToast("No se pudo actualizar.")
        return
      }
      showToast(next ? "Pedidos pausados." : "Recibiendo pedidos de nuevo.")
    } catch {
      setPaused(!next)
      showToast("No se pudo actualizar.")
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-[22px] font-bold tracking-tight text-stone-900">Pedidos</h1>
          <p className="text-base text-stone-700">{business.name} · Hoy</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold text-stone-700">Recibiendo pedidos</span>
          <button
            type="button"
            role="switch"
            aria-checked={!paused}
            onClick={() => void togglePaused()}
            className={`flex h-[48px] w-16 items-center rounded-full p-1.5 transition ${paused ? "bg-stone-300" : "bg-[var(--color-primary,#F97316)]"}`}
          >
            <span
              className={`h-9 w-9 rounded-full bg-white shadow transition-transform ${paused ? "translate-x-0" : "translate-x-4"}`}
            />
          </button>
        </div>
      </header>

      {toReview.length > 0 ? (
        <Link
          href={`/${slug}/dashboard/orders/${toReview[0].id}`}
          className="flex min-h-[56px] items-center justify-between rounded-2xl bg-[#FEF9C3] px-4 text-base font-semibold text-[#A16207]"
        >
          <span>
            {toReview.length} {toReview.length === 1 ? "comprobante para revisar" : "comprobantes para revisar"}
          </span>
          <span aria-hidden>→</span>
        </Link>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Link
          href={`/${slug}/dashboard/orders/horarios`}
          className="flex min-h-[56px] items-center justify-between rounded-2xl border border-[#E7E5E4] bg-white px-4 text-base font-semibold text-stone-900"
        >
          Horarios de atención
          <span aria-hidden className="text-[var(--color-primary,#F97316)]">→</span>
        </Link>
        <Link
          href={`/${slug}/dashboard/orders/productos`}
          className="flex min-h-[56px] items-center justify-between rounded-2xl border border-[#E7E5E4] bg-white px-4 text-base font-semibold text-stone-900"
        >
          Productos del menú
          <span aria-hidden className="text-[var(--color-primary,#F97316)]">→</span>
        </Link>
      </div>

      <nav aria-label="Filtro de pedidos" className="flex gap-2 overflow-x-auto">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => selectFilter(c.id)}
            className={`min-h-[48px] shrink-0 rounded-full px-4 text-base font-semibold ${
              filter === c.id
                ? "bg-[var(--color-primary,#F97316)] text-white"
                : "bg-[#F5F5F4] text-stone-700"
            }`}
          >
            {c.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#F5F5F4]" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-base text-stone-600">No se pudieron cargar los pedidos.</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setError("")
              setRetry((n) => n + 1)
            }}
            className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
          >
            Reintentar
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-base text-stone-600">
            {filter === "all"
              ? "Todavía no entraron pedidos."
              : `No hay pedidos en ${CHIPS.find((c) => c.id === filter)?.label}.`}
          </p>
          <Link
            href={`/${slug}/orders`}
            className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white flex items-center justify-center"
          >
            Ver el menú público
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/${slug}/dashboard/orders/${o.id}`}
                className="flex flex-col gap-1 rounded-2xl border border-[#E7E5E4] bg-white p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-bold text-stone-900">
                    #{o.orderNumber} · {relativeTime(o.createdAt)}
                  </span>
                  <span className="rounded-full bg-[#FFF7ED] px-2.5 py-1 text-sm font-semibold text-[var(--color-primary,#F97316)]">
                    {CHIPS.find((c) => c.id === filter)?.label ?? "Nuevo"}
                  </span>
                </div>
                <span className="text-base font-semibold text-stone-900">{o.customerName}</span>
                <span className="text-sm text-stone-600">{o.itemsSummary}</span>
                <span className="text-sm text-stone-600">
                  $ {formatCents(o.totalCents)} · {paymentLabel(o.paymentMethod, o.paymentStatus)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {toast ? (
        <p
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-2xl bg-stone-900 px-5 py-3 text-base font-semibold text-white shadow-lg"
        >
          {toast}
        </p>
      ) : null}
    </div>
  )
}
