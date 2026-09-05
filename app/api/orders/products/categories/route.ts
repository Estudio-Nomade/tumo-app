import { NextResponse, type NextRequest } from "next/server"
import { createCategory, listCategories } from "@/modules/orders/api/products"
import { productsDeps } from "@/modules/orders/lib/default-deps"
import { validateSession } from "@/shell/auth/session"

async function sessionOf(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value
  if (!token) return null
  return validateSession(token)
}

export async function GET(req: NextRequest) {
  const session = await sessionOf(req)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  const result = await listCategories(productsDeps, {
    businessId: session.businessId,
  })
  return NextResponse.json(result.body, { status: result.status })
}

export async function POST(req: NextRequest) {
  const session = await sessionOf(req)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  let body: { name?: string }
  try {
    body = (await req.json()) as { name?: string }
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const result = await createCategory(productsDeps, {
    businessId: session.businessId,
    name: body.name ?? "",
  })
  return NextResponse.json(result.body, { status: result.status })
}
