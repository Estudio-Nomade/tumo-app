import { NextResponse, type NextRequest } from "next/server"
import { createService, listServices } from "@/modules/turnos/api/services"
import { servicesDeps } from "@/modules/turnos/lib/default-deps"
import { validateSession } from "@/shell/auth/session"
import { getBusiness } from "@/shell/db/business"

async function sessionOf(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value
  if (!token) return null
  return validateSession(token)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get("slug")
  const activeOnly = searchParams.get("activeOnly") === "1"

  if (slug) {
    const business = await getBusiness(slug)
    if (!business?.active_modules.includes("turnos")) {
      return NextResponse.json({ error: "No encontrado." }, { status: 404 })
    }
    const result = await listServices(servicesDeps, {
      businessId: business.id,
      activeOnly,
    })
    return NextResponse.json(result.body, { status: result.status })
  }

  const session = await sessionOf(req)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }
  const result = await listServices(servicesDeps, {
    businessId: session.businessId,
    activeOnly,
  })
  return NextResponse.json(result.body, { status: result.status })
}

export async function POST(req: NextRequest) {
  const session = await sessionOf(req)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }
  let body: {
    name?: string
    priceCents?: number
    durationMinutes?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }
  const result = await createService(servicesDeps, {
    businessId: session.businessId,
    name: body.name ?? "",
    priceCents: body.priceCents ?? -1,
    durationMinutes: body.durationMinutes ?? 0,
  })
  return NextResponse.json(result.body, { status: result.status })
}
