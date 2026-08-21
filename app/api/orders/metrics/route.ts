import { NextResponse, type NextRequest } from "next/server"
import { getMetrics } from "@/modules/orders/api/metrics"
import { metricsDeps } from "@/modules/orders/lib/default-deps"
import { validateSession } from "@/shell/auth/session"

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value
  if (!token) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }
  const session = await validateSession(token)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  const result = await getMetrics(metricsDeps, {
    businessId: session.businessId,
  })
  return NextResponse.json(result.body, { status: result.status })
}
