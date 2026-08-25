import { NextResponse, type NextRequest } from "next/server"
import { getSettings, updateHours } from "@/modules/orders/api/settings"
import { settingsDeps } from "@/modules/orders/lib/default-deps"
import { validateSession } from "@/shell/auth/session"

async function auth(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value
  if (!token) return null
  return validateSession(token)
}

export async function GET(req: NextRequest) {
  const session = await auth(req)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  const result = await getSettings(settingsDeps, {
    businessId: session.businessId,
  })
  return NextResponse.json(result.body, { status: result.status })
}

export async function PATCH(req: NextRequest) {
  const session = await auth(req)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  let body: { hours?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const result = await updateHours(settingsDeps, {
    businessId: session.businessId,
    hours: body.hours,
  })
  return NextResponse.json(result.body, { status: result.status })
}
