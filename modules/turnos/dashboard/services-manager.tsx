"use client"

import { useEffect, useState } from "react"
import {
  formatCents,
  parsePesosInput,
  pesosAmountToInput,
} from "@/modules/turnos/lib/types"

type Service = {
  id: string
  name: string
  priceCents: number
  durationMinutes: number
  isActive: boolean
}

export default function ServicesManager({ slug }: { slug: string }) {
  const [services, setServices] = useState<Service[]>([])
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [duration, setDuration] = useState("30")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editDuration, setEditDuration] = useState("30")
  const [editActive, setEditActive] = useState(true)
  const [editError, setEditError] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  async function reload() {
    const r = await fetch("/api/turnos/services")
    const d = await r.json()
    setServices(d.services ?? [])
  }

  useEffect(() => {
    let cancelled = false
    void fetch("/api/turnos/services")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setServices(d.services ?? [])
      })
      .catch(() => {
        if (!cancelled) setServices([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  function startEdit(s: Service) {
    setEditingId(s.id)
    setEditName(s.name)
    setEditPrice(pesosAmountToInput(s.priceCents))
    setEditDuration(String(s.durationMinutes))
    setEditActive(s.isActive)
    setEditError("")
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError("")
  }

  async function onCreate() {
    setError("")
    const amount = parsePesosInput(price)
    if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount)) {
      setError("Precio inválido.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/turnos/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          priceCents: amount,
          durationMinutes: Number(duration),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear")
        return
      }
      setName("")
      setPrice("")
      await reload()
    } catch {
      setError("No se pudo crear. Revisá la conexión.")
    } finally {
      setSaving(false)
    }
  }

  async function onSaveEdit() {
    if (!editingId) return
    setEditError("")
    const amount = parsePesosInput(editPrice)
    if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount)) {
      setEditError("Precio inválido.")
      return
    }
    const durationMinutes = Number(editDuration)
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      setEditError("Duración inválida.")
      return
    }
    setEditSaving(true)
    try {
      const res = await fetch("/api/turnos/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: editingId,
          name: editName,
          priceCents: amount,
          durationMinutes,
          isActive: editActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEditError(data.error ?? "No se pudo guardar")
        return
      }
      setEditingId(null)
      await reload()
    } catch {
      setEditError("No se pudo guardar. Revisá la conexión.")
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-2">
      <a
        href={`/${slug}/dashboard/turnos`}
        className="text-base font-semibold text-stone-600"
      >
        ← Volver
      </a>
      <h1 className="text-2xl font-bold">Servicios</h1>
      <ul className="flex flex-col gap-2">
        {services.map((s) => {
          const isEditing = editingId === s.id
          return (
            <li
              key={s.id}
              className="rounded-2xl border border-stone-200 bg-white p-4"
            >
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <p className="text-base font-bold text-stone-900">
                    Editar servicio
                  </p>
                  <label className="flex flex-col gap-1.5 text-sm font-semibold text-stone-600">
                    Nombre
                    <input
                      className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base font-normal text-stone-900"
                      value={editName}
                      disabled={editSaving}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-semibold text-stone-600">
                    Precio (pesos)
                    <input
                      className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base font-normal text-stone-900"
                      value={editPrice}
                      disabled={editSaving}
                      inputMode="decimal"
                      onChange={(e) => setEditPrice(e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-semibold text-stone-600">
                    Duración (min)
                    <input
                      className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base font-normal text-stone-900"
                      value={editDuration}
                      disabled={editSaving}
                      inputMode="numeric"
                      onChange={(e) => setEditDuration(e.target.value)}
                    />
                  </label>
                  <label className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-stone-200 px-3">
                    <span className="text-sm font-semibold text-stone-700">
                      Activo (se ofrece al cliente)
                    </span>
                    <input
                      type="checkbox"
                      className="h-6 w-6"
                      checked={editActive}
                      disabled={editSaving}
                      onChange={(e) => setEditActive(e.target.checked)}
                    />
                  </label>
                  {editError ? (
                    <p role="alert" className="text-sm text-red-600">
                      {editError}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={editSaving}
                      onClick={() => void onSaveEdit()}
                      className="min-h-[52px] flex-1 rounded-2xl text-base font-bold text-white disabled:opacity-60"
                      style={{ background: "var(--color-primary, #F97316)" }}
                    >
                      {editSaving ? "Guardando…" : "Guardar cambios"}
                    </button>
                    <button
                      type="button"
                      disabled={editSaving}
                      onClick={cancelEdit}
                      className="min-h-[52px] flex-1 rounded-2xl border border-stone-200 text-base font-semibold text-stone-700 disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{s.name}</p>
                      <p className="text-sm text-stone-600">
                        $ {formatCents(s.priceCents)} · {s.durationMinutes} min
                        · {s.isActive ? "Activo" : "Inactivo"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      disabled={editingId != null}
                      className="inline-flex min-h-[48px] items-center rounded-xl border border-stone-200 px-3 text-sm font-semibold disabled:opacity-50"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-bold">Nuevo servicio</h2>
        <div className="flex flex-col gap-3">
          <input
            className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base"
            placeholder="Nombre"
            value={name}
            disabled={saving}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base"
            placeholder="Precio (pesos)"
            value={price}
            disabled={saving}
            onChange={(e) => setPrice(e.target.value)}
          />
          <input
            className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base"
            placeholder="Duración (min)"
            value={duration}
            disabled={saving}
            onChange={(e) => setDuration(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={saving}
            onClick={() => void onCreate()}
            className="min-h-[56px] rounded-2xl text-lg font-bold text-white disabled:opacity-60"
            style={{ background: "var(--color-primary, #F97316)" }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}
