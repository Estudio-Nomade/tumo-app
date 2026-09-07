"use client"

import { useEffect, useMemo, useState } from "react"
import { formatCents } from "@/modules/turnos/lib/types"
import {
  buildBookingWhatsAppHref,
  buildBookingWhatsAppMessage,
} from "@/modules/turnos/lib/whatsapp"

type Booking = {
  id: string
  serviceName: string
  startsAt: string
  status: string
  paymentMethod: string
  paymentStatus: string
  priceCents: number
  durationMinutes: number
}

export default function BookingConfirmation({
  slug,
  bookingId,
  businessName,
}: {
  slug: string
  bookingId: string
  businessName: string
}) {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetch(
        `/api/turnos/bookings/${encodeURIComponent(bookingId)}?slug=${encodeURIComponent(slug)}`
      ).then((r) => r.json()),
      fetch(
        `/api/turnos/settings?slug=${encodeURIComponent(slug)}`
      ).then((r) => r.json()),
    ])
      .then(([bookingData, settingsData]) => {
        if (cancelled) return
        if (bookingData.error || !bookingData.booking) {
          setError(bookingData.error ?? "No encontramos esa reserva.")
          setBooking(null)
        } else {
          setBooking(bookingData.booking as Booking)
        }
        setWhatsappPhone(
          (settingsData.settings?.whatsappPhone as string | null | undefined) ??
            null
        )
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError("No pudimos cargar la reserva.")
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [bookingId, slug])

  const waHref = useMemo(() => {
    if (!booking || !whatsappPhone) return null
    const text = buildBookingWhatsAppMessage({
      businessName,
      serviceName: booking.serviceName,
      startsAt: booking.startsAt,
      durationMinutes: booking.durationMinutes,
      priceCents: booking.priceCents,
      paymentMethod: booking.paymentMethod,
      bookingId: booking.id,
    })
    return buildBookingWhatsAppHref({ phone: whatsappPhone, text })
  }, [booking, businessName, whatsappPhone])

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[40vh] w-full max-w-md items-center justify-center px-4 text-base text-stone-600">
        Cargando…
      </main>
    )
  }

  if (error || !booking) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10">
        <p className="text-base font-medium text-red-600">
          {error || "Reserva no encontrada."}
        </p>
        <a
          href={`/${slug}/turnos`}
          className="flex min-h-[52px] items-center justify-center rounded-2xl border border-stone-200 text-base font-semibold"
        >
          Volver al inicio
        </a>
      </main>
    )
  }

  const when = new Date(booking.startsAt).toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  })
  const payLabel =
    booking.paymentMethod === "transfer"
      ? booking.paymentStatus === "paid"
        ? "Transferencia confirmada"
        : "Comprobante en revisión"
      : booking.paymentStatus === "paid"
        ? "Pagado en el local"
        : "A pagar en el local"

  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-10 text-center">
      <p className="text-sm font-semibold text-stone-500">{businessName}</p>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-4xl text-green-600">
        ✓
      </div>
      <h1 className="text-2xl font-bold text-stone-900">
        {booking.paymentMethod === "transfer"
          ? "¡Listo, turno reservado!"
          : "Reserva recibida"}
      </h1>
      <div className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left">
        <p className="text-lg font-bold">{booking.serviceName}</p>
        <p className="text-base text-stone-600 capitalize">{when}</p>
        <p className="text-base text-stone-600">
          {booking.durationMinutes} min · $ {formatCents(booking.priceCents)}
        </p>
        <p className="mt-2 text-sm font-semibold text-stone-700">{payLabel}</p>
        <p className="mt-1 text-sm text-stone-400">#{booking.id.slice(0, 8)}</p>
      </div>
      {waHref ? (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-[#25D366] text-lg font-bold text-white"
        >
          Avisar por WhatsApp
        </a>
      ) : null}
      {booking.paymentMethod === "transfer" && waHref ? (
        <p className="text-sm text-stone-500">
          En WhatsApp podés adjuntar el comprobante que subiste.
        </p>
      ) : null}
      <a
        href={`/${slug}/turnos`}
        className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-stone-200 text-base font-semibold"
      >
        Volver al inicio
      </a>
    </main>
  )
}
