import type {
  BookingStatus,
  TurnosPaymentMethod,
  TurnosPaymentStatus,
} from "@/modules/turnos/lib/types"

const BOOKING_LABELS: Record<BookingStatus, string> = {
  pending: "Reservado",
  confirmed: "Confirmado",
  completed: "Atendido",
  cancelled: "Cancelado",
}

export function bookingStatusLabel(status: string): string {
  const key = String(status ?? "").trim()
  if (!key) return "—"
  return BOOKING_LABELS[key as BookingStatus] ?? key
}

export function bookingStatusBadgeClass(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-50 text-green-800"
    case "confirmed":
      return "bg-emerald-50 text-emerald-800"
    case "cancelled":
      return "bg-red-50 text-red-800"
    case "pending":
      return "bg-amber-50 text-amber-900"
    default:
      return "bg-stone-100 text-stone-700"
  }
}

export function paymentStatusLabel(method: string, status: string): string {
  const s = String(status ?? "").trim()
  const m = String(method ?? "").trim()
  if (s === "paid") return "Pagado"
  if (s === "rejected") return "Pago rechazado"
  if (m === "transfer" && s === "pending_receipt") return "Falta comprobante"
  if (m === "transfer" && s === "pending_verification") {
    return "Revisar comprobante"
  }
  if (m === "at_location" && s === "unpaid") return "Paga en el local"
  if (s === "unpaid") return "Sin cobrar"
  if (!s) return "—"
  return s
}

export function paymentStatusBadgeClass(status: string): string {
  switch (status) {
    case "paid":
      return "bg-green-50 text-green-800"
    case "rejected":
      return "bg-red-50 text-red-800"
    case "pending_verification":
      return "bg-amber-50 text-amber-900"
    case "pending_receipt":
    case "unpaid":
      return "bg-stone-100 text-stone-700"
    default:
      return "bg-stone-100 text-stone-700"
  }
}

export function paymentMethodLabel(method: string): string {
  const m = String(method ?? "").trim() as TurnosPaymentMethod | string
  if (m === "transfer") return "Transferencia"
  if (m === "at_location") return "En el local"
  if (!m) return "—"
  return m
}

export type { TurnosPaymentStatus }
