"use client"

import { useEffect, useMemo, useState } from "react"
import { formatCents } from "@/modules/turnos/lib/types"

type Service = {
  id: string
  name: string
  priceCents: number
  durationMinutes: number
}

type Props = {
  slug: string
  businessId: string
  businessName: string
}

type Step = "service" | "day" | "time" | "data" | "pay" | "done"

function nextDays(n: number): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const label =
      i === 0
        ? `Hoy · ${d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}`
        : i === 1
          ? `Mañana · ${d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}`
          : d.toLocaleDateString("es-AR", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })
    out.push({ iso, label })
  }
  return out
}

export default function BookingWizard({ slug, businessName }: Props) {
  const [step, setStep] = useState<Step>("service")
  const [services, setServices] = useState<Service[]>([])
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [time, setTime] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [payMethod, setPayMethod] = useState<"transfer" | "at_location" | null>(
    null
  )
  const [settings, setSettings] = useState<{
    transferAlias: string | null
    transferCbu: string | null
    transferHolder: string | null
  } | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const service = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  )
  const days = useMemo(() => nextDays(14), [])

  useEffect(() => {
    let cancelled = false
    void fetch(
      `/api/turnos/services?slug=${encodeURIComponent(slug)}&activeOnly=1`
    )
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
  }, [slug])

  useEffect(() => {
    if (!day || !serviceId) return
    let cancelled = false
    void fetch(
      `/api/turnos/availability?slug=${encodeURIComponent(slug)}&day=${day}&serviceId=${serviceId}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSlots(data.slots ?? [])
      })
      .catch(() => {
        if (!cancelled) setSlots([])
      })
    return () => {
      cancelled = true
    }
  }, [day, serviceId, slug])

  async function createAndMaybePay() {
    setError("")
    setLoading(true)
    try {
      if (!service || !day || !time || !payMethod) {
        setError("Faltan datos de la reserva.")
        return
      }
      const startsAt = new Date(`${day}T${time}:00`)
      const res = await fetch("/api/turnos/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          serviceId: service.id,
          startsAt: startsAt.toISOString(),
          customerName: name.trim(),
          customerPhone: phone.trim(),
          paymentMethod: payMethod,
          idempotencyKey: crypto.randomUUID(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la reserva.")
        return
      }
      const id = data.booking?.id as string
      setBookingId(id)

      if (payMethod === "transfer" && receiptFile) {
        const buf = new Uint8Array(await receiptFile.arrayBuffer())
        const b64 = btoa(String.fromCharCode(...buf))
        await fetch(`/api/turnos/bookings/${id}/receipt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            receiptBase64: b64,
            receiptMime: receiptFile.type || "image/jpeg",
            receiptFilename: receiptFile.name,
          }),
        })
      }
      window.location.href = `/${slug}/turnos/${id}`
    } catch {
      setError("No pudimos completar la reserva. Revisá tu conexión.")
    } finally {
      setLoading(false)
    }
  }

  const back = () => {
    setError("")
    if (step === "day") setStep("service")
    else if (step === "time") setStep("day")
    else if (step === "data") setStep("time")
    else if (step === "pay") setStep("data")
    else window.location.href = `/${slug}/turnos`
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-10 pt-4">
      {step !== "done" && (
        <button
          type="button"
          onClick={back}
          className="mb-4 flex min-h-[48px] min-w-[48px] items-center rounded-xl border border-stone-200 bg-white px-3 text-xl font-semibold"
        >
          ←
        </button>
      )}

      <p className="mb-2 text-sm font-semibold text-stone-500">{businessName}</p>

      {step === "service" && (
        <section className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold text-stone-900">¿Qué servicio querés?</h1>
          {services.length === 0 && (
            <p className="text-base text-stone-600">No hay servicios cargados.</p>
          )}
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setServiceId(s.id)}
              className={`flex min-h-[56px] w-full items-center justify-between rounded-2xl border bg-white p-4 text-left ${
                serviceId === s.id
                  ? "border-[var(--color-primary,#F97316)] border-2"
                  : "border-stone-200"
              }`}
            >
              <span>
                <span className="block text-lg font-semibold">{s.name}</span>
                <span className="text-sm text-stone-500">{s.durationMinutes} min</span>
              </span>
              <span className="text-lg font-bold">$ {formatCents(s.priceCents)}</span>
            </button>
          ))}
          <button
            type="button"
            disabled={!serviceId}
            onClick={() => setStep("day")}
            className="mt-2 flex min-h-[56px] w-full items-center justify-center rounded-2xl text-lg font-bold text-white disabled:bg-stone-300"
            style={{
              background: serviceId ? "var(--color-primary, #F97316)" : undefined,
            }}
          >
            Continuar
          </button>
        </section>
      )}

      {step === "day" && service && (
        <section className="flex flex-col gap-3">
          <p className="rounded-full bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-900">
            {service.name} · $ {formatCents(service.priceCents)}
          </p>
          <h1 className="text-2xl font-bold">¿Qué día te viene bien?</h1>
          {days.map((d) => (
            <button
              key={d.iso}
              type="button"
              onClick={() => {
                setDay(d.iso)
                setTime(null)
                setStep("time")
              }}
              className="flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 text-left text-lg font-semibold"
            >
              {d.label}
              <span className="text-stone-400">›</span>
            </button>
          ))}
        </section>
      )}

      {step === "time" && service && day && (
        <section className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold">
            {new Date(day + "T12:00:00").toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h1>
          {slots.length === 0 && (
            <p className="text-base text-stone-600">No hay horarios ese día.</p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {slots.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                className={`min-h-[52px] rounded-xl border text-base font-semibold ${
                  time === t
                    ? "border-transparent text-white"
                    : "border-stone-200 bg-white"
                }`}
                style={
                  time === t
                    ? { background: "var(--color-primary, #F97316)" }
                    : undefined
                }
              >
                {t}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!time}
            onClick={() => setStep("data")}
            className="mt-2 flex min-h-[56px] w-full items-center justify-center rounded-2xl text-lg font-bold text-white disabled:bg-stone-300"
            style={{
              background: time ? "var(--color-primary, #F97316)" : undefined,
            }}
          >
            Continuar al pago
          </button>
        </section>
      )}

      {step === "data" && (
        <section className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Tus datos</h1>
          <label className="flex flex-col gap-2 text-sm font-semibold text-stone-600">
            Nombre
            <input
              className="min-h-[56px] rounded-xl border border-stone-200 px-4 text-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. María Gómez"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-stone-600">
            WhatsApp
            <input
              className={`min-h-[56px] rounded-xl border px-4 text-base ${
                phoneError ? "border-red-500" : "border-stone-200"
              }`}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                setPhoneError("")
              }}
              placeholder="+54 9 11 5555-1234"
            />
            {phoneError && (
              <span className="text-sm font-medium text-red-600">{phoneError}</span>
            )}
          </label>
          <button
            type="button"
            onClick={() => {
              if (!name.trim()) {
                setError("Ingresá tu nombre")
                return
              }
              if (!phone.trim()) {
                setPhoneError("Ingresá tu WhatsApp")
                return
              }
              setStep("pay")
              fetch(`/api/turnos/settings?slug=${encodeURIComponent(slug)}`)
                .then((r) => r.json())
                .then((d) => setSettings(d.settings ?? null))
                .catch(() => null)
            }}
            className="flex min-h-[56px] w-full items-center justify-center rounded-2xl text-lg font-bold text-white"
            style={{ background: "var(--color-primary, #F97316)" }}
          >
            Continuar al pago
          </button>
        </section>
      )}

      {step === "pay" && service && (
        <section className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">¿Cómo vas a pagar?</h1>
          <p className="text-base text-stone-600">
            Monto: $ {formatCents(service.priceCents)}
          </p>
          {(
            [
              ["transfer", "Transferencia", "Alias/CBU + comprobante"],
              ["at_location", "Efectivo en el local", "Pagás cuando vayas"],
            ] as const
          ).map(([id, title, sub]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPayMethod(id)}
              className={`rounded-2xl border bg-white p-4 text-left ${
                payMethod === id
                  ? "border-2 border-[var(--color-primary,#F97316)]"
                  : "border-stone-200"
              }`}
            >
              <span className="block text-lg font-bold">{title}</span>
              <span className="text-sm text-stone-600">{sub}</span>
            </button>
          ))}

          {payMethod === "transfer" && settings && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-left">
              <p className="text-sm text-stone-600">Alias</p>
              <p className="text-lg font-bold">{settings.transferAlias ?? "—"}</p>
              <p className="mt-2 text-sm text-stone-600">CBU</p>
              <p className="font-semibold">{settings.transferCbu ?? "—"}</p>
              <label className="mt-4 flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white p-4">
                <span className="text-sm font-semibold text-stone-600">
                  {receiptFile
                    ? receiptFile.name
                    : "Subir foto o PDF del comprobante"}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          )}

          {payMethod === "at_location" && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Reserva recibida · pago en el local. El negocio puede confirmar tu
              asistencia.
            </p>
          )}

          {error && <p className="text-base font-medium text-red-600">{error}</p>}

          <button
            type="button"
            disabled={
              loading ||
              !payMethod ||
              (payMethod === "transfer" && !receiptFile)
            }
            onClick={() => void createAndMaybePay()}
            className="flex min-h-[56px] w-full items-center justify-center rounded-2xl text-lg font-bold text-white disabled:bg-stone-300"
            style={{
              background:
                payMethod && !(payMethod === "transfer" && !receiptFile)
                  ? "var(--color-primary, #F97316)"
                  : undefined,
            }}
          >
            {loading
              ? "Enviando…"
              : payMethod === "transfer"
                ? "Enviar comprobante"
                : "Confirmar reserva en efectivo"}
          </button>
        </section>
      )}

      {step === "done" && (
        <section className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-4xl text-green-600">
            ✓
          </div>
          <h1 className="text-2xl font-bold">
            {payMethod === "transfer"
              ? "¡Listo, turno reservado!"
              : "Reserva recibida"}
          </h1>
          {service && day && time && (
            <div className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left">
              <p className="text-lg font-bold">{service.name}</p>
              <p className="text-base text-stone-600">
                {day} · {time}
              </p>
              <p className="text-base text-stone-600">
                {payMethod === "transfer"
                  ? "Comprobante en revisión"
                  : "A pagar en el local"}{" "}
                · $ {formatCents(service.priceCents)}
              </p>
              {bookingId && (
                <p className="mt-2 text-sm text-stone-400">#{bookingId.slice(0, 8)}</p>
              )}
            </div>
          )}
          <a
            href={`/${slug}/turnos`}
            className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-stone-200 text-base font-semibold"
          >
            Volver al inicio
          </a>
        </section>
      )}
    </main>
  )
}
