"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatCents } from "@/modules/turnos/lib/types"
import {
  bookingStatusBadgeClass,
  bookingStatusLabel,
  paymentMethodLabel,
  paymentStatusBadgeClass,
  paymentStatusLabel,
} from "@/modules/turnos/lib/status-labels"

type Booking = {
  id: string
  status: string
  paymentMethod: string
  paymentStatus: string
  serviceName: string
  priceCents: number
  startsAt: string
  customerName?: string | null
  customerPhone?: string | null
}

type Props = { slug: string; bookingId: string }

export default function BookingDetail({ slug, bookingId }: Props) {
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [toast, setToast] = useState("")
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    void fetch(
      `/api/turnos/bookings/${bookingId}?slug=${encodeURIComponent(slug)}`
    )
      .then(async (res) => {
        const json = (await res.json()) as {
          booking?: Booking
          error?: string
        }
        if (cancelled) return
        if (!res.ok || !json.booking) {
          setError(json.error ?? "No encontramos ese turno.")
          setBooking(null)
          return
        }
        setBooking(json.booking)
        setError("")
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar el turno.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [bookingId, slug, reload])

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(""), 2500)
  }

  async function act(
    body: Record<string, unknown>,
    success: string
  ): Promise<boolean> {
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/turnos/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as {
        error?: string
        booking?: Partial<Booking>
      }
      if (!res.ok) {
        setError(json.error ?? "No se pudo actualizar el turno.")
        return false
      }
      if (json.booking) {
        setBooking((prev) =>
          prev
            ? {
                ...prev,
                status: json.booking!.status ?? prev.status,
                paymentStatus:
                  json.booking!.paymentStatus ?? prev.paymentStatus,
              }
            : prev
        )
      }
      showToast(success)
      setReload((n) => n + 1)
      return true
    } catch {
      setError("No se pudo actualizar el turno.")
      return false
    } finally {
      setBusy(false)
    }
  }

  if (loading && !booking) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3 p-4">
        <div className="h-20 animate-pulse rounded-2xl bg-stone-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-stone-100" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 p-4 py-12 text-center">
        <p className="text-base text-stone-600">
          {error || "No encontramos ese turno."}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/${slug}/dashboard/turnos`)}
          className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
        >
          Volver a turnos
        </button>
      </div>
    )
  }

  const when = new Date(booking.startsAt).toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  })
  const terminal =
    booking.status === "completed" || booking.status === "cancelled"
  const canComplete = !terminal
  const canCancel = booking.status !== "cancelled"
  const canApproveTransfer =
    booking.paymentMethod === "transfer" &&
    booking.paymentStatus === "pending_verification" &&
    !terminal
  const canMarkCash =
    booking.paymentMethod === "at_location" &&
    booking.paymentStatus !== "paid" &&
    booking.status !== "cancelled"

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4">
      <button
        type="button"
        onClick={() => router.push(`/${slug}/dashboard/turnos`)}
        className="min-h-[48px] self-start text-base font-semibold text-stone-600"
      >
        ← Volver
      </button>
      <h1 className="text-2xl font-bold text-stone-900">Detalle turno</h1>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <p className="text-xl font-bold capitalize">{when}</p>
        <p className="text-lg font-semibold">{booking.serviceName}</p>
        <p className="text-base text-stone-600">
          $ {formatCents(booking.priceCents)} ·{" "}
          {paymentMethodLabel(booking.paymentMethod)}
        </p>
        {(booking.customerName || booking.customerPhone) && (
          <p className="mt-2 text-base text-stone-700">
            {booking.customerName ?? "Cliente"}
            {booking.customerPhone ? ` · ${booking.customerPhone}` : ""}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${bookingStatusBadgeClass(booking.status)}`}
          >
            {bookingStatusLabel(booking.status)}
          </span>
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${paymentStatusBadgeClass(booking.paymentStatus)}`}
          >
            {paymentStatusLabel(booking.paymentMethod, booking.paymentStatus)}
          </span>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 p-3 text-base font-medium text-red-700">
          {error}
        </p>
      ) : null}
      {toast ? (
        <p className="rounded-xl bg-green-50 p-3 text-base font-medium text-green-800">
          {toast}
        </p>
      ) : null}

      {canComplete ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void act({ action: "complete" }, "Marcado como atendido")}
          className="flex min-h-[56px] w-full items-center justify-center rounded-2xl text-lg font-bold text-white disabled:opacity-60"
          style={{ background: "var(--color-primary, #F97316)" }}
        >
          Marcar atendido
        </button>
      ) : null}

      {canApproveTransfer ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => void act({ action: "approve_payment" }, "Pago aprobado")}
            className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-green-600 text-base font-semibold text-green-700 disabled:opacity-60"
          >
            Aprobar pago
          </button>
          <div className="flex flex-col gap-2">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo"
              disabled={busy}
              className="min-h-[48px] rounded-xl border border-stone-200 px-3 text-base"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!rejectReason.trim()) {
                  setError("Indicá el motivo del rechazo.")
                  return
                }
                void act(
                  { action: "reject_payment", reason: rejectReason.trim() },
                  "Pago rechazado"
                )
              }}
              className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-red-500 text-base font-semibold text-red-600 disabled:opacity-60"
            >
              Rechazar pago
            </button>
          </div>
        </>
      ) : null}

      {canMarkCash ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void act({ action: "mark_paid_local" }, "Marcado pagado en local")
          }
          className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-stone-300 text-base font-semibold disabled:opacity-60"
        >
          Marcar pagado en local
        </button>
      ) : null}

      {canCancel && booking.status !== "completed" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!window.confirm("¿Cancelar este turno?")) return
            void act({ action: "cancel" }, "Turno cancelado")
          }}
          className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-base font-semibold text-red-700 disabled:opacity-60"
        >
          Cancelar turno
        </button>
      ) : null}
    </div>
  )
}
