import { NextResponse, type NextRequest } from "next/server"
import { submitTransferReceipt } from "@/modules/turnos/api/payments"
import { paymentsDeps } from "@/modules/turnos/lib/default-deps"
import { getBusiness } from "@/shell/db/business"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  let body: {
    slug?: string
    receiptBase64?: string
    receiptMime?: string
    receiptFilename?: string
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
  const raw = body.receiptBase64 ?? ""
  const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0))
  const result = await submitTransferReceipt(paymentsDeps, {
    businessId: business.id,
    bookingId: id,
    receiptBytes: bytes,
    receiptMime: body.receiptMime ?? "image/jpeg",
    receiptFilename: body.receiptFilename ?? "comprobante.jpg",
  })
  return NextResponse.json(result.body, { status: result.status })
}
