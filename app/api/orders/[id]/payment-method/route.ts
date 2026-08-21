import { NextResponse, type NextRequest } from "next/server"
import { changePaymentMethod } from "@/modules/orders/api/orders"
import { ordersDeps } from "@/modules/orders/lib/default-deps"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  let body: { paymentMethod?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const result = await changePaymentMethod(ordersDeps, {
    orderId: id,
    paymentMethod: body.paymentMethod as "transfer" | "mercadopago" | "at_pickup",
  })
  return NextResponse.json(result.body, { status: result.status })
}
