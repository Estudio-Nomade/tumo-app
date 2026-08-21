import { NextResponse, type NextRequest } from "next/server"
import { setPaused } from "@/modules/orders/api/metrics"
import { metricsDeps } from "@/modules/orders/lib/default-deps"
import { validateSession } from "@/shell/auth/session"

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value
  if (!token) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }
  const session = await validateSession(token)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  let body: { isPaused?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const result = await setPaused(metricsDeps, {
    businessId: session.businessId,
    isPaused: Boolean(body.isPaused),
  })
  return NextResponse.json(result.body, { status: result.status })
}
