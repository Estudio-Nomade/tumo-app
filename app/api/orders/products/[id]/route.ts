import { NextResponse, type NextRequest } from "next/server"
import { deleteProduct, updateProduct } from "@/modules/orders/api/products"
import { productsDeps } from "@/modules/orders/lib/default-deps"
import { validateSession } from "@/shell/auth/session"

type Params = { params: Promise<{ id: string }> }

async function sessionOf(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value
  if (!token) return null
  return validateSession(token)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await sessionOf(req)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  let body: {
    name?: string
    priceCents?: number
    description?: string
    categoryId?: string | null
    photo?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const result = await updateProduct(productsDeps, {
    productId: id,
    businessId: session.businessId,
    name: body.name ?? "",
    priceCents: Number(body.priceCents),
    description: body.description,
    categoryId: body.categoryId,
    photo: body.photo,
  })
  return NextResponse.json(result.body, { status: result.status })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await sessionOf(req)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  const result = await deleteProduct(productsDeps, {
    productId: id,
    businessId: session.businessId,
  })
  return NextResponse.json(result.body, { status: result.status })
}
