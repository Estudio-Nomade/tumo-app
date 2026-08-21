import { NextResponse, type NextRequest } from "next/server"
import {
  cancelOrder,
  getOrder,
  transitionStatus,
  verifyPayment,
} from "@/modules/orders/api/orders"
import { ordersDeps } from "@/modules/orders/lib/default-deps"
import { validateSession } from "@/shell/auth/session"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const clientId = req.cookies.get("client_id")?.value
  const result = await getOrder(ordersDeps, { id, clientId })
  return NextResponse.json(result.body, { status: result.status })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params

  const token = req.cookies.get("session_token")?.value
  if (!token) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }
  const session = await validateSession(token)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  let body: { action?: unknown; newStatus?: unknown; decision?: unknown; reason?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  let result
  switch (body.action) {
    case "transition":
      result = await transitionStatus(ordersDeps, {
        orderId: id,
        newStatus: typeof body.newStatus === "string" ? body.newStatus : "",
      })
      break
    case "verify":
      result = await verifyPayment(ordersDeps, {
        orderId: id,
        action: body.decision === "reject" ? "reject" : "approve",
        reason: typeof body.reason === "string" ? body.reason : undefined,
      })
      break
    case "cancel":
      result = await cancelOrder(ordersDeps, {
        orderId: id,
        reason: typeof body.reason === "string" ? body.reason : undefined,
      })
      break
    default:
      return NextResponse.json({ error: "Acción inválida." }, { status: 400 })
  }

  return NextResponse.json(result.body, { status: result.status })
}
