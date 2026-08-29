"use client"

import { useEffect, useState } from "react"

export default function TurnosSettingsForm({ slug }: { slug: string }) {
  const [alias, setAlias] = useState("")
  const [cbu, setCbu] = useState("")
  const [holder, setHolder] = useState("")
  const [paused, setPaused] = useState(false)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    let cancelled = false
    void fetch("/api/turnos/settings")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const s = d.settings
        if (!s) return
        setAlias(s.transferAlias ?? "")
        setCbu(s.transferCbu ?? "")
        setHolder(s.transferHolder ?? "")
        setPaused(Boolean(s.isPaused))
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [])

  async function save() {
    setMsg("")
    const res = await fetch("/api/turnos/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transferAlias: alias,
        transferCbu: cbu,
        transferHolder: holder,
        isPaused: paused,
        hours: {
          mon: [["09:00", "18:00"]],
          tue: [["09:00", "18:00"]],
          wed: [["09:00", "18:00"]],
          thu: [["09:00", "18:00"]],
          fri: [["09:00", "18:00"]],
          sat: [["09:00", "13:00"]],
        },
      }),
    })
    if (!res.ok) {
      const d = await res.json()
      setMsg(d.error ?? "Error al guardar")
      return
    }
    setMsg("Guardado.")
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-2">
      <a
        href={`/${slug}/dashboard/turnos`}
        className="text-base font-semibold text-stone-600"
      >
        ← Volver
      </a>
      <h1 className="text-2xl font-bold">Config de Turnos</h1>
      <p className="rounded-xl bg-orange-50 p-3 text-sm text-orange-900">
        Para nombre, logo o colores del negocio andá a Ajustes (shell).
      </p>
      <label className="flex flex-col gap-2 text-sm font-semibold text-stone-600">
        Alias transferencia
        <input
          className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-stone-600">
        CBU / CVU
        <input
          className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base"
          value={cbu}
          onChange={(e) => setCbu(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-stone-600">
        Titular
        <input
          className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base"
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
        />
      </label>
      <label className="flex min-h-[56px] items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4">
        <span className="text-base font-bold">Pausar reservas</span>
        <input
          type="checkbox"
          checked={paused}
          onChange={(e) => setPaused(e.target.checked)}
          className="h-6 w-6"
        />
      </label>
      {msg && <p className="text-base text-stone-700">{msg}</p>}
      <button
        type="button"
        onClick={() => void save()}
        className="min-h-[56px] rounded-2xl text-lg font-bold text-white"
        style={{ background: "var(--color-primary, #F97316)" }}
      >
        Guardar ajustes
      </button>
    </div>
  )
}
