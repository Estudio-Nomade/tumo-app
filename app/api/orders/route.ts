import { NextResponse, type NextRequest } from "next/server"
import { createOrder, listOrders, type OrderStatusFilter } from "@/modules/orders/api/orders"
import { ordersDeps } from "@/modules/orders/lib/default-deps"
import { validateSession } from "@/shell/auth/session"

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const result = await createOrder(ordersDeps, {
    slug: typeof body.slug === "string" ? body.slug : "",
    idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : "",
    name: typeof body.name === "string" ? body.name : "",
    phone: typeof body.phone === "string" ? body.phone : "",
    notes: typeof body.notes === "string" ? body.notes : undefined,
    fulfillment:
      body.fulfillment === "delivery" ? "delivery" : "pickup",
    deliveryAddress:
      typeof body.deliveryAddress === "string" ? body.deliveryAddress : undefined,
    paymentMethod: body.paymentMethod as "transfer" | "mercadopago" | "at_pickup",
    items: Array.isArray(body.items)
      ? (body.items as {
          productId?: unknown
          quantity?: unknown
          variantOptionIds?: unknown
          notes?: unknown
        }[]).map((it) => ({
          productId: typeof it.productId === "string" ? it.productId : "",
          quantity: Number(it.quantity),
          variantOptionIds: Array.isArray(it.variantOptionIds)
            ? (it.variantOptionIds as string[])
            : [],
          notes: typeof it.notes === "string" ? it.notes : undefined,
        }))
      : [],
  })

  return NextResponse.json(result.body, { status: result.status })
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value
  if (!token) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }
  const session = await validateSession(token)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  const raw = req.nextUrl.searchParams.get("status") ?? "all"
  const statusFilter: OrderStatusFilter = [
    "new",
    "preparing",
    "ready",
    "completed",
    "all",
  ].includes(raw)
    ? (raw as OrderStatusFilter)
    : "all"

  const result = await listOrders(ordersDeps, {
    businessId: session.businessId,
    statusFilter,
  })
  return NextResponse.json(result.body, { status: result.status })
}
