import { NextResponse, type NextRequest } from "next/server"
import { getBooking } from "@/modules/turnos/api/bookings"
import { bookingsDeps } from "@/modules/turnos/lib/default-deps"
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
