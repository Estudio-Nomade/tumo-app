"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2 } from "lucide-react"
import type { PointRange } from "@/modules/loyalty/lib/types"

type Props = {
  slug: string
  initialNeeded: number
  initialReward: string
  initialRanges: PointRange[]
}

function clampNeeded(n: number) {
  if (!Number.isFinite(n)) return 2
  return Math.min(10000, Math.max(2, Math.round(n)))
}

function pesosToCents(pesos: number) {
  return Math.max(0, Math.round(pesos * 100))
}

function centsToPesos(cents: number) {
  return Math.round(cents / 100)
}

const defaultRanges = (): PointRange[] => [
  { min_cents: 0, max_cents: null, points: 1 },
]

export default function ProgramForm({
  slug,
  initialNeeded,
  initialReward,
  initialRanges,
}: Props) {
  const router = useRouter()
  const [needed, setNeeded] = useState(clampNeeded(initialNeeded))
  const [reward, setReward] = useState(initialReward)
  const [ranges, setRanges] = useState<PointRange[]>(
    initialRanges?.length ? initialRanges : defaultRanges()
  )
  const [savedNeeded, setSavedNeeded] = useState(clampNeeded(initialNeeded))
  const [savedReward, setSavedReward] = useState(initialReward)
  const [savedRanges, setSavedRanges] = useState(
    JSON.stringify(initialRanges?.length ? initialRanges : defaultRanges())
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")

  const dirty = useMemo(() => {
    return (
      needed !== savedNeeded ||
      reward.trim() !== savedReward.trim() ||
      JSON.stringify(ranges) !== savedRanges
    )
  }, [needed, reward, ranges, savedNeeded, savedReward, savedRanges])

  const rewardOk = reward.trim().length >= 2 && reward.trim().length <= 40
  const canSave = dirty && rewardOk && !saving

  function updateRange(i: number, patch: Partial<PointRange>) {
    setRanges((prev) => {
      const next = prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
      // keep contiguity: max of i = min of i+1
      for (let j = 0; j < next.length - 1; j++) {
        next[j] = { ...next[j]!, max_cents: next[j + 1]!.min_cents }
      }
      next[next.length - 1] = { ...next[next.length - 1]!, max_cents: null }
      return next
    })
  }

  function addBand() {
    setRanges((prev) => {
      const last = prev[prev.length - 1]
      if (!last) return defaultRanges()
      const cut = last.min_cents + 1000000
      const head = prev.slice(0, -1).map((r, i, arr) =>
        i === arr.length - 1 ? { ...r, max_cents: last.min_cents } : r
      )
      const mid: PointRange = {
        min_cents: last.min_cents,
        max_cents: cut,
        points: last.points || 50,
      }
      const open: PointRange = {
        min_cents: cut,
        max_cents: null,
        points: Math.max(last.points, 1) + 50,
      }
      const base =
        prev.length === 1
          ? [{ min_cents: 0, max_cents: cut, points: 0 }, open]
          : [...head, mid, open]
      for (let j = 0; j < base.length - 1; j++) {
        base[j] = { ...base[j]!, max_cents: base[j + 1]!.min_cents }
      }
      base[base.length - 1] = { ...base[base.length - 1]!, max_cents: null }
      return base
    })
  }

  function removeBand(i: number) {
    setRanges((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((_, idx) => idx !== i)
      for (let j = 0; j < next.length - 1; j++) {
        next[j] = { ...next[j]!, max_cents: next[j + 1]!.min_cents }
      }
      next[next.length - 1] = { ...next[next.length - 1]!, max_cents: null }
      return next
    })
  }

  async function onSave() {
    if (!canSave) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/loyalty/program", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points_needed: needed,
          reward_name: reward.trim(),
          point_ranges: ranges,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar.")
        return
      }
      const nextReward = reward.trim()
      setReward(nextReward)
      setSavedNeeded(needed)
      setSavedReward(nextReward)
      setSavedRanges(JSON.stringify(ranges))
      setToast("Listo, se guardó")
      window.setTimeout(() => setToast(""), 2500)
      router.refresh()
    } catch {
      setError("No se pudo guardar. Probá de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <header className="flex flex-col gap-1">
        <Link
          href={`/${slug}/dashboard/loyalty`}
          className="text-xs font-semibold text-[var(--color-primary,#F97316)]"
        >
          ← Fidelización
        </Link>
        <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
          Programa
        </h1>
        <p className="text-[13px] text-stone-500">
          Puntos para canjear, premio y tramos por monto
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          Premio
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-stone-800">
            Puntos para canjear
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Menos"
              onClick={() => setNeeded((n) => clampNeeded(n - 10))}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E7E5E4] bg-[#FAFAF9]"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              min={2}
              max={10000}
              value={needed}
              onChange={(e) => setNeeded(clampNeeded(Number(e.target.value)))}
              className="h-11 w-24 rounded-xl border border-[#E7E5E4] text-center text-lg font-bold outline-none"
            />
            <button
              type="button"
              aria-label="Más"
              onClick={() => setNeeded((n) => clampNeeded(n + 10))}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E7E5E4] bg-[#FAFAF9]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-800">
            Nombre del premio
          </span>
          <input
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            maxLength={40}
            className="rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm outline-none"
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Tramos monto → puntos
          </div>
          <button
            type="button"
            onClick={addBand}
            className="text-xs font-bold text-[var(--color-primary,#F97316)]"
          >
            + Tramo
          </button>
        </div>
        <p className="text-xs text-stone-500">
          Montos en pesos. El último tramo queda abierto. Un tramo de 0 pts al
          inicio = piso (no se registra).
        </p>
        {ranges.map((band, i) => {
          const isLast = i === ranges.length - 1
          return (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-xl border border-[#F5F5F4] bg-[#FAFAF9] p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500">
                  Tramo {i + 1}
                  {isLast ? " (abierto)" : ""}
                </span>
                {ranges.length > 1 ? (
                  <button
                    type="button"
                    aria-label="Eliminar tramo"
                    onClick={() => removeBand(i)}
                    className="text-stone-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1 text-xs">
                  Desde $
                  <input
                    type="number"
                    min={0}
                    value={centsToPesos(band.min_cents)}
                    onChange={(e) =>
                      updateRange(i, {
                        min_cents: pesosToCents(Number(e.target.value)),
                      })
                    }
                    className="h-10 rounded-lg border border-[#E7E5E4] px-2 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  Hasta $
                  <input
                    type="number"
                    min={0}
                    disabled={isLast}
                    value={
                      band.max_cents == null
                        ? ""
                        : centsToPesos(band.max_cents)
                    }
                    placeholder={isLast ? "∞" : ""}
                    onChange={(e) =>
                      updateRange(i, {
                        max_cents: pesosToCents(Number(e.target.value)),
                      })
                    }
                    className="h-10 rounded-lg border border-[#E7E5E4] px-2 text-sm disabled:bg-stone-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  Puntos
                  <input
                    type="number"
                    min={0}
                    value={band.points}
                    onChange={(e) =>
                      updateRange(i, {
                        points: Math.max(0, Math.round(Number(e.target.value))),
                      })
                    }
                    className="h-10 rounded-lg border border-[#E7E5E4] px-2 text-sm font-bold"
                  />
                </label>
              </div>
            </div>
          )
        })}
      </section>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canSave}
        onClick={onSave}
        className="w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>

      {toast ? (
        <div className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1C1917] px-4 py-2 text-sm font-medium text-white">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
