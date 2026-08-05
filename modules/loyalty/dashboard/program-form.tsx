"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Minus, Plus } from "lucide-react"

type Props = {
  slug: string
  initialNeeded: number
  initialReward: string
}

function clampNeeded(n: number) {
  if (!Number.isFinite(n)) return 2
  return Math.min(50, Math.max(2, Math.round(n)))
}

export default function ProgramForm({
  slug,
  initialNeeded,
  initialReward,
}: Props) {
  const router = useRouter()
  const [needed, setNeeded] = useState(clampNeeded(initialNeeded))
  const [reward, setReward] = useState(initialReward)
  const [savedNeeded, setSavedNeeded] = useState(clampNeeded(initialNeeded))
  const [savedReward, setSavedReward] = useState(initialReward)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")

  const dirty = useMemo(() => {
    return (
      needed !== savedNeeded || reward.trim() !== savedReward.trim()
    )
  }, [needed, reward, savedNeeded, savedReward])

  const rewardOk = reward.trim().length >= 2 && reward.trim().length <= 40
  const canSave = dirty && rewardOk && !saving

  async function onSave() {
    if (!canSave) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/loyalty/program", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchases_needed: needed,
          reward_name: reward.trim(),
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
          Cuántas compras y qué premio
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          Regla
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-stone-800">
            Compras para canjear
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Menos"
              onClick={() => setNeeded((n) => clampNeeded(n - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] text-stone-800"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              min={2}
              max={50}
              value={needed}
              onChange={(e) => setNeeded(clampNeeded(Number(e.target.value)))}
              className="h-11 w-20 rounded-xl border border-[#E7E5E4] text-center text-lg font-bold text-stone-900 outline-none focus:border-[var(--color-primary,#F97316)]"
            />
            <button
              type="button"
              aria-label="Más"
              onClick={() => setNeeded((n) => clampNeeded(n + 1))}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] text-stone-800"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <span className="text-xs text-stone-400">
            El cliente completa el círculo al llegar a este número
          </span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-800">
            Nombre del premio
          </span>
          <input
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            maxLength={40}
            className="rounded-xl border border-[#E7E5E4] px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-[var(--color-primary,#F97316)]"
          />
          <span className="text-xs text-stone-400">
            Aparece en la tarjeta del cliente y al canjear
          </span>
          {!rewardOk && reward.trim().length > 0 ? (
            <span className="text-xs text-red-600">
              Entre 2 y 40 caracteres.
            </span>
          ) : null}
        </label>

        <div className="rounded-xl bg-[#FFF7ED] px-3 py-2.5 text-sm text-stone-800">
          En{" "}
          <span className="font-bold text-[var(--color-primary,#F97316)]">
            {needed}
          </span>{" "}
          compras →{" "}
          <span className="font-semibold">
            {reward.trim() || "tu premio"}
          </span>
        </div>
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
        className="w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>

      {toast ? (
        <div className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1C1917] px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
