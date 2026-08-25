import { NextResponse, type NextRequest } from "next/server"
import { saveVariants } from "@/modules/orders/api/products"
import { productsDeps } from "@/modules/orders/lib/default-deps"
import { validateSession } from "@/shell/auth/session"

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const token = req.cookies.get("session_token")?.value
  if (!token) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }
  const session = await validateSession(token)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  let body: { groups?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const result = await saveVariants(productsDeps, {
    productId: id,
    businessId: session.businessId,
    groups: (body.groups ?? []) as never,
  })
  return NextResponse.json(result.body, { status: result.status })
}
