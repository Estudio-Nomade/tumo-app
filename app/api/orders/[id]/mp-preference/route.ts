import { NextResponse, type NextRequest } from "next/server"
import { createPreference } from "@/modules/orders/api/mercadopago"
import { mercadopagoDeps } from "@/modules/orders/lib/default-deps"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const appUrl = req.nextUrl.origin
  const result = await createPreference(mercadopagoDeps, { orderId: id, appUrl })
  return NextResponse.json(result.body, { status: result.status })
}
