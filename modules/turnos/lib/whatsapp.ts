import { formatCents } from "@/modules/turnos/lib/types"

export function whatsappDigits(phone: string): string {
  return (phone ?? "").replace(/\D/g, "")
}

export function buildBookingWhatsAppHref(input: {
  phone: string
  text: string
}): string | null {
  const digits = whatsappDigits(input.phone)
  if (digits.length < 8) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(input.text)}`
}

export function buildBookingWhatsAppMessage(input: {
  businessName: string
  serviceName: string
  startsAt: string
  durationMinutes: number
  priceCents: number
  paymentMethod: string
  bookingId: string
}): string {
  const when = new Date(input.startsAt).toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  })
  const pay =
    input.paymentMethod === "transfer"
      ? "Transferencia"
      : "Pago en el local"
  const ref = input.bookingId.slice(0, 8)
  const lines = [
    `Hola! Reservé un turno en ${input.businessName}`,
    `• ${input.serviceName}`,
    `• ${when}`,
    `• ${input.durationMinutes} min · $ ${formatCents(input.priceCents)}`,
    `• Pago: ${pay}`,
    `• Ref: #${ref}`,
  ]
  if (input.paymentMethod === "transfer") {
    lines.push("")
    lines.push(
      "Adjuntá el comprobante de transferencia que subiste en la app."
    )
  }
  return lines.join("\n")
}
