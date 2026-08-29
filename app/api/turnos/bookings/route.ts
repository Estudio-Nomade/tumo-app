import { NextResponse, type NextRequest } from "next/server"
import { createBooking, listBookings } from "@/modules/turnos/api/bookings"
import { bookingsDeps } from "@/modules/turnos/lib/default-deps"
import type { TurnosPaymentMethod } from "@/modules/turnos/lib/types"
import { validateSession } from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"

async function sessionOf(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value
  if (!token) return null
  return validateSession(token)
}

export async function GET(req: NextRequest) {
  const session = await sessionOf(req)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }
  const filter = new URL(req.url).searchParams.get("filter") as
    | "today"
    | "upcoming"
    | "pending_payment"
    | "all"
    | null
  const result = await listBookings(bookingsDeps, {
    businessId: session.businessId,
    filter: filter ?? "today",
  })
  return NextResponse.json(result.body, { status: result.status })
}

export async function POST(req: NextRequest) {
  let body: {
    slug?: string
    serviceId?: string
    startsAt?: string
    customerName?: string
    customerPhone?: string
    paymentMethod?: TurnosPaymentMethod
    idempotencyKey?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const business = body.slug ? await getBusiness(body.slug) : null
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado." }, { status: 404 })
  }

  const result = await createBooking(bookingsDeps, {
    businessId: business.id,
    serviceId: body.serviceId ?? "",
    startsAt: body.startsAt ?? "",
    customerName: body.customerName ?? "",
    customerPhone: body.customerPhone ?? "",
    paymentMethod: body.paymentMethod ?? "at_location",
    idempotencyKey: body.idempotencyKey ?? "",
  })
  return NextResponse.json(result.body, { status: result.status })
}
