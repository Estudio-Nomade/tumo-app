"use client"

import { useEffect, useState } from "react"
import type { HoursMap } from "@/modules/turnos/lib/availability"
import {
  DAY_ORDER,
  editorStateToHours,
  hoursToEditorState,
  validateEditorState,
  type DayEditorState,
  type DayKey,
} from "@/modules/turnos/lib/hours-editor"
import TurnosHoursEditor from "@/modules/turnos/dashboard/turnos-hours-editor"

export default function TurnosSettingsForm({ slug }: { slug: string }) {
  const [alias, setAlias] = useState("")
  const [cbu, setCbu] = useState("")
  const [holder, setHolder] = useState("")
  const [whatsappPhone, setWhatsappPhone] = useState("")
  const [paused, setPaused] = useState(false)
  const [days, setDays] = useState<Record<DayKey, DayEditorState>>(() =>
    hoursToEditorState({})
  )
  const [originalHours, setOriginalHours] = useState<HoursMap>({})
  const [touched, setTouched] = useState<Set<DayKey>>(() => new Set())
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [msg, setMsg] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetch("/api/turnos/settings")
      .then(async (r) => {
        if (!r.ok) throw new Error("load")
        return r.json() as Promise<{ settings?: Record<string, unknown> }>
      })
      .then((d) => {
        if (cancelled) return
        const s = d.settings
        if (!s) {
          setLoaded(true)
          return
        }
        setAlias(String(s.transferAlias ?? ""))
        setCbu(String(s.transferCbu ?? ""))
        setHolder(String(s.transferHolder ?? ""))
        setWhatsappPhone(String(s.whatsappPhone ?? ""))
        setPaused(Boolean(s.isPaused))
        const hours = (s.hours ?? {}) as HoursMap
        setOriginalHours(
          typeof hours === "object" && hours && !Array.isArray(hours)
            ? (hours as HoursMap)
            : {}
        )
        setDays(hoursToEditorState(hours))
        setTouched(new Set())
        setLoadFailed(false)
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) {
          setLoadFailed(true)
          setMsg("No se pudo cargar la configuración.")
          setLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  function onDaysChange(next: Record<DayKey, DayEditorState>) {
    const changed = new Set(touched)
    for (const { key } of DAY_ORDER) {
      const a = days[key]
      const b = next[key]
      if (
        a.closed !== b.closed ||
        a.open !== b.open ||
        a.close !== b.close
      ) {
        changed.add(key)
      }
    }
    setTouched(changed)
    setDays(next)
  }

  async function save() {
    if (!loaded) return
    setMsg("")
    if (loadFailed) {
      setMsg("Recargá la página antes de guardar.")
      return
    }
    const hoursErr = validateEditorState(days, touched)
    if (hoursErr) {
      setMsg(hoursErr)
      return
    }
    const hours = editorStateToHours(days, {
      original: originalHours,
      touched,
    })
    setSaving(true)
    try {
      const res = await fetch("/api/turnos/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transferAlias: alias,
          transferCbu: cbu,
          transferHolder: holder,
          whatsappPhone: whatsappPhone,
          isPaused: paused,
          hours,
        }),
      })
      if (!res.ok) {
        let err = "Error al guardar"
        try {
          const d = (await res.json()) as { error?: string }
          err = d.error ?? err
        } catch {
          /* ignore */
        }
        setMsg(err)
        return
      }
      setOriginalHours(hours)
      setTouched(new Set())
      setMsg("Guardado.")
    } catch {
      setMsg("No se pudo guardar. Revisá la conexión.")
    } finally {
      setSaving(false)
    }
  }

  const waEmpty = whatsappPhone.trim() === ""
  const busy = saving || !loaded

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

      {!loaded ? (
        <p className="text-base text-stone-600">Cargando horarios…</p>
      ) : (
        <TurnosHoursEditor
          days={days}
          onChange={onDaysChange}
          disabled={busy}
          originalHours={originalHours}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-stone-900">
          Datos de transferencia
        </h2>
        <label className="flex flex-col gap-2 text-sm font-semibold text-stone-600">
          Alias transferencia
          <input
            className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base"
            value={alias}
            disabled={busy}
            onChange={(e) => setAlias(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-stone-600">
          CBU / CVU
          <input
            className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base"
            value={cbu}
            disabled={busy}
            onChange={(e) => setCbu(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-stone-600">
          Titular
          <input
            className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base"
            value={holder}
            disabled={busy}
            onChange={(e) => setHolder(e.target.value)}
          />
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-stone-900">
          Contacto para reservas
        </h2>
        {waEmpty ? (
          <p
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
          >
            Falta el WhatsApp: el cliente no va a poder avisarte al reservar.
          </p>
        ) : null}
        <label className="flex flex-col gap-2 text-sm font-semibold text-stone-600">
          WhatsApp del negocio
          <input
            className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base"
            value={whatsappPhone}
            disabled={busy}
            onChange={(e) => setWhatsappPhone(e.target.value)}
            placeholder="Ej. +54 9 11 1234-5678"
            inputMode="tel"
          />
          <span className="text-xs font-normal text-stone-500">
            Número donde el cliente te avisa por WhatsApp al reservar (se abre
            un chat con los datos del turno). No es envío automático.
          </span>
        </label>
      </section>

      <label className="flex min-h-[56px] items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4">
        <span className="text-base font-bold">Pausar reservas</span>
        <input
          type="checkbox"
          checked={paused}
          disabled={busy}
          onChange={(e) => setPaused(e.target.checked)}
          className="h-6 w-6"
        />
      </label>
      {msg && (
        <p
          role={msg === "Guardado." ? "status" : "alert"}
          className="text-base text-stone-700"
        >
          {msg}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="min-h-[56px] rounded-2xl text-lg font-bold text-white disabled:opacity-60"
        style={{ background: "var(--color-primary, #F97316)" }}
      >
        {saving ? "Guardando…" : !loaded ? "Cargando…" : "Guardar ajustes"}
      </button>
    </div>
  )
}
