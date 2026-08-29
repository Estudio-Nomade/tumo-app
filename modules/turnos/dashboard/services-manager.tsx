"use client"

import { useEffect, useState } from "react"
import { formatCents } from "@/modules/turnos/lib/types"

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

  async function onCreate() {
    setError("")
    const priceCents = Math.round(Number(price.replace(/\D/g, "")) * (price.includes(",") ? 1 : 1))
    // accept pesos as integer pesos → cents * 100 if user types 12500 as pesos without decimals
    const cents =
      price.includes(".") || price.includes(",")
        ? Math.round(parseFloat(price.replace(",", ".")) * 100)
        : Math.round(Number(price) * 100)

    const res = await fetch("/api/turnos/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        priceCents: Number.isFinite(cents) ? cents : priceCents,
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
        {services.map((s) => (
          <li
            key={s.id}
            className="rounded-2xl border border-stone-200 bg-white p-4"
          >
            <p className="text-lg font-semibold">{s.name}</p>
            <p className="text-sm text-stone-600">
              $ {formatCents(s.priceCents)} · {s.durationMinutes} min ·{" "}
              {s.isActive ? "Activo" : "Inactivo"}
            </p>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-bold">Nuevo servicio</h2>
        <div className="flex flex-col gap-3">
          <input
            className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base"
            placeholder="Precio (pesos)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <input
            className="min-h-[52px] rounded-xl border border-stone-200 px-3 text-base"
            placeholder="Duración (min)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={() => void onCreate()}
            className="min-h-[56px] rounded-2xl text-lg font-bold text-white"
            style={{ background: "var(--color-primary, #F97316)" }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
