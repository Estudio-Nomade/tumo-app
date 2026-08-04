import { NextResponse, type NextRequest } from "next/server"
import { redeemReward } from "@/modules/loyalty/api/redemptions"
import { redemptionDeps } from "@/modules/loyalty/lib/default-deps"
import { validateSession } from "@/shell/auth/session"

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value
  if (!token) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  const session = await validateSession(token)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  let body: { customerId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  if (!body.customerId) {
    return NextResponse.json(
      { error: "customerId es requerido." },
      { status: 400 }
    )
  }

  const result = await redeemReward(redemptionDeps, {
    customerId: body.customerId,
    employeeId: session.id,
    businessId: session.businessId,
  })

  return NextResponse.json(result.body, { status: result.status })
}
