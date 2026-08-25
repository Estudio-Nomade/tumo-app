"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DAY_NAMES,
  validateDayHours,
  type OrdersHours,
} from "@/modules/orders/lib/hours"

type DayState = { open: string; close: string; closed: boolean }

type UpdateResult = { ok: true } | { ok: false; error: string }

function toDayState(hours: OrdersHours | null | undefined, key: string): DayState {
  const d = hours?.[key]
  if (d && !d.closed && d.open && d.close) {
    return { open: d.open, close: d.close, closed: false }
  }
  return { open: "19:00", close: "23:00", closed: true }
}

function toOrdersHours(state: Record<string, DayState>): OrdersHours {
  const out: OrdersHours = {}
  for (const [key, d] of Object.entries(state)) {
    out[key] = d.closed
      ? { closed: true }
      : { open: d.open, close: d.close, closed: false }
  }
  return out
}

async function defaultUpdateHours(hours: OrdersHours): Promise<UpdateResult> {
  const res = await fetch("/api/orders/settings/hours", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hours }),
  })
  const json = (await res.json()) as { error?: string }
  if (!res.ok) {
    return { ok: false, error: json.error ?? "No pudimos guardar los horarios." }
  }
  return { ok: true }
}

const initialDays = (): Record<string, DayState> =>
  Object.fromEntries(
    DAY_NAMES.map((_, i) => [String(i), toDayState(null, String(i))])
  )

export default function HoursEditor({
  slug,
  updateHours = defaultUpdateHours,
}: {
  slug: string
  updateHours?: (hours: OrdersHours) => Promise<UpdateResult>
}) {
  const router = useRouter()
  const [days, setDays] = useState<Record<string, DayState>>(initialDays)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saved, setSaved] = useState("")

  useEffect(() => {
    let cancelled = false
    fetch("/api/orders/settings/hours")
      .then((res) => res.json())
      .then((json: { hours?: OrdersHours; error?: string }) => {
        if (cancelled) return
        if (json.error) {
          setError(json.error)
          return
        }
        const hours = json.hours ?? {}
        setDays((prev) => {
          const next = { ...prev }
          for (let i = 0; i < 7; i++) next[String(i)] = toDayState(hours, String(i))
          return next
        })
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar los horarios.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [retry])

  function update(key: string, patch: Partial<DayState>) {
    setDays((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  async function save() {
    setSaveError("")
    setSaved("")
    for (let i = 0; i < 7; i++) {
      const key = String(i)
      const d = days[key]
      if (d.closed) continue
      const err = validateDayHours({ open: d.open, close: d.close, closed: false })
      if (err) {
        setSaveError(`${DAY_NAMES[i]}: ${err}`)
        return
      }
    }
    setSaving(true)
    const result = await updateHours(toOrdersHours(days))
    setSaving(false)
    if (!result.ok) {
      setSaveError(result.error)
      return
    }
    setSaved("Horarios guardados.")
    window.setTimeout(() => setSaved(""), 2500)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header className="flex flex-col">
        <button
          type="button"
          onClick={() => router.push(`/${slug}/dashboard/orders`)}
          className="min-h-[48px] text-left text-base font-semibold text-[var(--color-primary,#F97316)]"
        >
          ← Pedidos
        </button>
        <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
          Horarios de atención
        </h1>
      </header>

      <p className="text-base text-stone-700">
        Elegí qué días y en qué horarios recibís pedidos. Si cerrás después de
        medianoche, poné una hora de cierre menor a la de apertura.
      </p>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-[#F5F5F4]" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-base text-stone-600">No pudimos cargar los horarios.</p>
          <button
            type="button"
            onClick={() => {
              setError("")
              setLoading(true)
              setRetry((n) => n + 1)
            }}
            className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {DAY_NAMES.map((label, i) => {
            const key = String(i)
            const day = days[key]
            return (
              <li key={key} className="rounded-2xl border border-[#E7E5E4] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-bold capitalize text-stone-900">
                    {label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-600">
                      Cerrado todo el día
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={day.closed}
                      aria-label={`${day.closed ? "Abrir" : "Cerrar"} el ${label}`}
                      onClick={() => update(key, { closed: !day.closed })}
                      className={`flex h-[48px] w-16 items-center rounded-full p-1.5 transition ${
                        day.closed ? "bg-stone-300" : "bg-green-500"
                      }`}
                    >
                      <span
                        className={`h-9 w-9 rounded-full bg-white shadow transition-transform ${
                          day.closed ? "translate-x-0" : "translate-x-4"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {!day.closed ? (
                  <div className="mt-3 flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-semibold text-stone-600">Apertura</span>
                      <input
                        type="time"
                        value={day.open}
                        onChange={(e) => update(key, { open: e.target.value })}
                        className="min-h-[52px] rounded-2xl border border-[#E7E5E4] bg-white px-4 text-base text-stone-900 outline-none focus:border-[var(--color-primary,#F97316)]"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-semibold text-stone-600">Cierre</span>
                      <input
                        type="time"
                        value={day.close}
                        onChange={(e) => update(key, { close: e.target.value })}
                        className="min-h-[52px] rounded-2xl border border-[#E7E5E4] bg-white px-4 text-base text-stone-900 outline-none focus:border-[var(--color-primary,#F97316)]"
                      />
                    </label>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {saveError ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {saveError}
        </p>
      ) : null}

      {!loading && !error ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar horarios"}
        </button>
      ) : null}

      {saved ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-xl bg-green-50 px-4 py-3 text-base font-semibold text-green-800"
        >
          {saved}
        </p>
      ) : null}
    </div>
  )
}
