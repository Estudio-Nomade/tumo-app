import { NextResponse, type NextRequest } from "next/server"
import {
  getMetrics,
  getRecentActivity,
} from "@/modules/loyalty/api/metrics"
import { metricsDeps } from "@/modules/loyalty/lib/default-deps"
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

  if (session.role !== "owner") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 })
  }

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "10")
  const [metrics, activity] = await Promise.all([
    getMetrics(metricsDeps, { businessId: session.businessId }),
    getRecentActivity(metricsDeps, {
      businessId: session.businessId,
      limit: Number.isFinite(limit) ? limit : 10,
    }),
  ])

  return NextResponse.json({ metrics, activity })
}
