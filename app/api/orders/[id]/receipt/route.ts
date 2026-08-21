import { NextResponse, type NextRequest } from "next/server"
import { uploadReceipt } from "@/modules/orders/api/orders"
import { ordersDeps } from "@/modules/orders/lib/default-deps"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  let body: { mime?: unknown; data?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const mime = typeof body.mime === "string" ? body.mime : ""
  const dataBase64 = typeof body.data === "string" ? body.data : ""

  let data: Uint8Array
  try {
    data = Buffer.from(dataBase64, "base64")
  } catch {
    return NextResponse.json({ error: "Imagen inválida." }, { status: 400 })
  }

  const result = await uploadReceipt(ordersDeps, { orderId: id, mime, data })
  return NextResponse.json(result.body, { status: result.status })
}
