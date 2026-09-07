import { NextResponse, type NextRequest } from "next/server"
import {
  getBooking,
  updateBookingStatus,
} from "@/modules/turnos/api/bookings"
import {
  approvePayment,
  markPaidAtLocation,
  rejectPayment,
} from "@/modules/turnos/api/payments"
import { bookingsDeps, paymentsDeps } from "@/modules/turnos/lib/default-deps"
import { validateSession } from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const slug = new URL(req.url).searchParams.get("slug")?.trim() ?? ""
  if (!slug) {
    return NextResponse.json({ error: "slug es requerido." }, { status: 400 })
  }
  const business = await getBusiness(slug)
  if (!business || !business.active_modules.includes("turnos")) {
    return NextResponse.json({ error: "Negocio no encontrado." }, { status: 404 })
  }
  const result = await getBooking(bookingsDeps, {
    businessId: business.id,
    bookingId: id,
  })
  return NextResponse.json(result.body, { status: result.status })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params

  const token = req.cookies.get("session_token")?.value
  if (!token) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }
  const session = await validateSession(token)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  let body: { action?: unknown; reason?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const action = typeof body.action === "string" ? body.action : ""
  const businessId = session.businessId
  const employeeId = session.id

  let result
  switch (action) {
    case "complete":
      result = await updateBookingStatus(bookingsDeps, {
        businessId,
        bookingId: id,
        status: "completed",
      })
      break
    case "cancel":
      result = await updateBookingStatus(bookingsDeps, {
        businessId,
        bookingId: id,
        status: "cancelled",
      })
      break
    case "approve_payment":
      result = await approvePayment(paymentsDeps, {
        businessId,
        bookingId: id,
        employeeId,
      })
      break
    case "reject_payment":
      result = await rejectPayment(paymentsDeps, {
        businessId,
        bookingId: id,
        employeeId,
        reason: typeof body.reason === "string" ? body.reason : "",
      })
      break
    case "mark_paid_local":
      result = await markPaidAtLocation(paymentsDeps, {
        businessId,
        bookingId: id,
        employeeId,
      })
      break
    default:
      return NextResponse.json({ error: "Acción inválida." }, { status: 400 })
  }

  return NextResponse.json(result.body, { status: result.status })
}
