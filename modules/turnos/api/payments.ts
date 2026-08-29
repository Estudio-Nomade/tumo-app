import type { JsonResult, SqlTagged } from "@/modules/turnos/lib/types"

export type PaymentsDeps = {
  sql: SqlTagged
}

export async function submitTransferReceipt(
  deps: PaymentsDeps,
  input: {
    businessId: string
    bookingId: string
    receiptBytes: Uint8Array
    receiptMime: string
    receiptFilename: string
  }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  const bookingId = input.bookingId?.trim() ?? ""
  if (!businessId || !bookingId) {
    return { status: 400, body: { error: "Datos incompletos." } }
  }
  if (!input.receiptBytes?.length) {
    return { status: 400, body: { error: "Subí el comprobante." } }
  }

  const bookings = (await deps.sql`
    SELECT id, price_cents, payment_method, payment_status, status
    FROM turnos_bookings
    WHERE id = ${bookingId} AND business_id = ${businessId}
  `) as {
    id: string
    price_cents: number
    payment_method: string
    payment_status: string
    status: string
  }[]

  const b = bookings[0]
  if (!b) {
    return { status: 404, body: { error: "Reserva no encontrada." } }
  }
  if (b.payment_method !== "transfer") {
    return { status: 400, body: { error: "Esta reserva no es por transferencia." } }
  }

  await deps.sql`
    INSERT INTO turnos_payments (
      booking_id, method, status, amount_cents,
      receipt_bytes, receipt_mime, receipt_filename
    ) VALUES (
      ${bookingId},
      'transfer',
      'pending_verification',
      ${b.price_cents},
      ${input.receiptBytes},
      ${input.receiptMime || "application/octet-stream"},
      ${input.receiptFilename || "comprobante"}
    )
  `

  await deps.sql`
    UPDATE turnos_bookings
    SET payment_status = 'pending_verification',
        status = CASE WHEN status = 'pending' THEN 'pending' ELSE status END,
        updated_at = now()
    WHERE id = ${bookingId}
  `

  return {
    status: 200,
    body: { ok: true, paymentStatus: "pending_verification" },
  }
}

export async function approvePayment(
  deps: PaymentsDeps,
  input: { businessId: string; bookingId: string; employeeId: string }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  const bookingId = input.bookingId?.trim() ?? ""
  if (!businessId || !bookingId) {
    return { status: 400, body: { error: "Datos incompletos." } }
  }

  const rows = (await deps.sql`
    UPDATE turnos_bookings
    SET payment_status = 'paid',
        status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
        updated_at = now()
    WHERE id = ${bookingId} AND business_id = ${businessId}
    RETURNING id, payment_status, status
  `) as { id: string; payment_status: string; status: string }[]

  if (!rows[0]) {
    return { status: 404, body: { error: "Reserva no encontrada." } }
  }

  await deps.sql`
    UPDATE turnos_payments
    SET status = 'paid',
        verified_by = ${input.employeeId || null},
        verified_at = now()
    WHERE booking_id = ${bookingId}
      AND status = 'pending_verification'
  `

  return {
    status: 200,
    body: {
      booking: {
        id: rows[0].id,
        paymentStatus: rows[0].payment_status,
        status: rows[0].status,
      },
    },
  }
}

export async function rejectPayment(
  deps: PaymentsDeps,
  input: {
    businessId: string
    bookingId: string
    employeeId: string
    reason: string
  }
): Promise<JsonResult> {
  const reason = input.reason?.trim() ?? ""
  if (!reason) {
    return { status: 400, body: { error: "Indicá el motivo del rechazo." } }
  }
  const businessId = input.businessId?.trim() ?? ""
  const bookingId = input.bookingId?.trim() ?? ""
  if (!businessId || !bookingId) {
    return { status: 400, body: { error: "Datos incompletos." } }
  }

  const rows = (await deps.sql`
    UPDATE turnos_bookings
    SET payment_status = 'rejected', updated_at = now()
    WHERE id = ${bookingId} AND business_id = ${businessId}
    RETURNING id, payment_status, status
  `) as { id: string; payment_status: string; status: string }[]

  if (!rows[0]) {
    return { status: 404, body: { error: "Reserva no encontrada." } }
  }

  await deps.sql`
    UPDATE turnos_payments
    SET status = 'rejected',
        rejection_reason = ${reason},
        verified_by = ${input.employeeId || null},
        verified_at = now()
    WHERE booking_id = ${bookingId}
      AND status = 'pending_verification'
  `

  return {
    status: 200,
    body: {
      booking: {
        id: rows[0].id,
        paymentStatus: rows[0].payment_status,
        status: rows[0].status,
      },
    },
  }
}

export async function markPaidAtLocation(
  deps: PaymentsDeps,
  input: { businessId: string; bookingId: string; employeeId: string }
): Promise<JsonResult> {
  return approvePayment(deps, input)
}
