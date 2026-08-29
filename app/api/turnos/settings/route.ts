import { NextResponse, type NextRequest } from "next/server"
import { getSettings, upsertSettings } from "@/modules/turnos/api/settings"
import { settingsDeps } from "@/modules/turnos/lib/default-deps"
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
  if (slug) {
    const business = await getBusiness(slug)
    if (!business?.active_modules.includes("turnos")) {
      return NextResponse.json({ error: "No encontrado." }, { status: 404 })
    }
    const result = await getSettings(settingsDeps, { businessId: business.id })
    return NextResponse.json(result.body, { status: result.status })
  }
  const session = await sessionOf(req)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }
  const result = await getSettings(settingsDeps, {
    businessId: session.businessId,
  })
  return NextResponse.json(result.body, { status: result.status })
}

export async function PUT(req: NextRequest) {
  const session = await sessionOf(req)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }
  if (session.role !== "owner") {
    return NextResponse.json({ error: "Solo el dueño." }, { status: 403 })
  }
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }
  const result = await upsertSettings(settingsDeps, {
    businessId: session.businessId,
    transferAlias: body.transferAlias as string | undefined,
    transferCbu: body.transferCbu as string | undefined,
    transferHolder: body.transferHolder as string | undefined,
    isPaused: body.isPaused as boolean | undefined,
    hours: body.hours,
  })
  return NextResponse.json(result.body, { status: result.status })
}
