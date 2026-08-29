import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { getBooking, updateBookingStatus } from "@/modules/turnos/api/bookings"
import {
  approvePayment,
  markPaidAtLocation,
  rejectPayment,
} from "@/modules/turnos/api/payments"
import { bookingsDeps, paymentsDeps } from "@/modules/turnos/lib/default-deps"
import { formatCents } from "@/modules/turnos/lib/types"
import { validateSession } from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"

type PageProps = {
  params: Promise<{ slug: string; id: string }>
}

export default async function TurnosDetailPage({ params }: PageProps) {
  const { slug, id } = await params
  const business = await getBusiness(slug)
  if (!business || !business.active_modules.includes("turnos")) notFound()

  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value
  if (!token) redirect(`/${slug}/login`)
  const session = await validateSession(token)
  if (!session || session.businessId !== business.id) {
    redirect(`/${slug}/login`)
  }

  async function markCompleted() {
    "use server"
    await updateBookingStatus(bookingsDeps, {
      businessId: business!.id,
      bookingId: id,
      status: "completed",
    })
  }

  async function cancelBooking() {
    "use server"
    await updateBookingStatus(bookingsDeps, {
      businessId: business!.id,
      bookingId: id,
      status: "cancelled",
    })
  }

  async function approve() {
    "use server"
    await approvePayment(paymentsDeps, {
      businessId: business!.id,
      bookingId: id,
      employeeId: session!.id,
    })
  }

  async function markCashPaid() {
    "use server"
    await markPaidAtLocation(paymentsDeps, {
      businessId: business!.id,
      bookingId: id,
      employeeId: session!.id,
    })
  }

  async function reject(formData: FormData) {
    "use server"
    const reason = String(formData.get("reason") ?? "")
    await rejectPayment(paymentsDeps, {
      businessId: business!.id,
      bookingId: id,
      employeeId: session!.id,
      reason,
    })
  }

  const result = await getBooking(bookingsDeps, {
    businessId: business.id,
    bookingId: id,
  })
  if (result.status !== 200) notFound()
  const booking = (result.body as { booking: {
    id: string
    serviceName: string
    startsAt: string
    status: string
    paymentStatus: string
    paymentMethod: string
    priceCents: number
  } }).booking

  const when = new Date(booking.startsAt).toLocaleString("es-AR")

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4">
      <a
        href={`/${slug}/dashboard/turnos`}
        className="text-base font-semibold text-stone-600"
      >
        ← Volver
      </a>
      <h1 className="text-2xl font-bold">Detalle turno</h1>
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <p className="text-xl font-bold">{when}</p>
        <p className="text-lg font-semibold">{booking.serviceName}</p>
        <p className="text-base text-stone-600">
          $ {formatCents(booking.priceCents)} · {booking.paymentMethod}
        </p>
        <p className="mt-2 text-sm">
          Estado: <strong>{booking.status}</strong> · Pago:{" "}
          <strong>{booking.paymentStatus}</strong>
        </p>
      </div>

      <form action={markCompleted}>
        <button
          type="submit"
          className="flex min-h-[56px] w-full items-center justify-center rounded-2xl text-lg font-bold text-white"
          style={{ background: "var(--color-primary, #F97316)" }}
        >
          Marcar atendido
        </button>
      </form>

      {booking.paymentMethod === "transfer" &&
        booking.paymentStatus === "pending_verification" && (
          <>
            <form action={approve}>
              <button
                type="submit"
                className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-green-600 text-base font-semibold text-green-700"
              >
                Aprobar pago
              </button>
            </form>
            <form action={reject} className="flex flex-col gap-2">
              <input
                name="reason"
                placeholder="Motivo del rechazo"
                className="min-h-[48px] rounded-xl border border-stone-200 px-3"
                required
              />
              <button
                type="submit"
                className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-red-500 text-base font-semibold text-red-600"
              >
                Rechazar pago
              </button>
            </form>
          </>
        )}

      {booking.paymentMethod === "at_location" &&
        booking.paymentStatus !== "paid" && (
          <form action={markCashPaid}>
            <button
              type="submit"
              className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-stone-300 text-base font-semibold"
            >
              Marcar pagado en local
            </button>
          </form>
        )}

      <form action={cancelBooking}>
        <button
          type="submit"
          className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-base font-semibold text-red-700"
        >
          Cancelar turno
        </button>
      </form>
    </div>
  )
}
