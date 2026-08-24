import { NextResponse, type NextRequest } from "next/server"
import { handleWebhook } from "@/modules/orders/api/mercadopago"
import { mercadopagoDeps } from "@/modules/orders/lib/default-deps"

type Params = { params: Promise<{ businessId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { businessId } = await params
  const rawBody = await req.text()
  const signatureHeader = req.headers.get("x-signature")
  const result = await handleWebhook(mercadopagoDeps, {
    rawBody,
    signatureHeader,
    businessId,
  })
  return NextResponse.json(result.body, { status: result.status })
}
