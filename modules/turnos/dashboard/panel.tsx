"use client"

import { useEffect, useState } from "react"
import { formatCents } from "@/modules/turnos/lib/types"

type Booking = {
  id: string
  startsAt: string
  serviceName: string
  status: string
  paymentStatus: string
  priceCents: number
}

type Props = { slug: string }

const FILTERS = [
  { id: "today", label: "Hoy" },
  { id: "upcoming", label: "Próximos" },
  { id: "pending_payment", label: "Pend. pago" },
  { id: "all", label: "Todos" },
] as const

export default function TurnosPanel({ slug }: Props) {
  const [filter, setFilter] =
    useState<(typeof FILTERS)[number]["id"]>("today")
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/turnos/bookings?filter=${filter}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setBookings(d.bookings ?? [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBookings([])
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [filter])

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-2">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-stone-900">Turnos</h1>
        <div className="flex gap-2">
          <a
            href={`/${slug}/dashboard/turnos/servicios`}
            className="inline-flex min-h-[48px] items-center rounded-xl border border-stone-200 px-3 text-sm font-semibold"
          >
            Servicios
          </a>
          <a
            href={`/${slug}/dashboard/turnos/ajustes`}
            className="inline-flex min-h-[48px] items-center rounded-xl border border-stone-200 px-3 text-sm font-semibold"
          >
            ⚙
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`min-h-[40px] rounded-full px-3 text-sm font-semibold ${
              filter === f.id
                ? "text-white"
                : "bg-stone-100 text-stone-600"
            }`}
            style={
              filter === f.id
                ? { background: "var(--color-primary, #F97316)" }
                : undefined
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-base text-stone-600">Cargando…</p>
      )}
      {!loading && bookings.length === 0 && (
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-base text-stone-600">
          No hay turnos para mostrar.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {bookings.map((b) => {
          const t = new Date(b.startsAt)
          const hm = t.toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          })
          return (
            <li key={b.id}>
              <a
                href={`/${slug}/dashboard/turnos/${b.id}`}
                className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold">{hm}</span>
                  <span className="flex gap-1">
                    <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-800">
                      {b.status}
                    </span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                      {b.paymentStatus}
                    </span>
                  </span>
                </div>
                <p className="text-base font-semibold">{b.serviceName}</p>
                <p className="text-sm text-stone-500">
                  $ {formatCents(b.priceCents)}
                </p>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
