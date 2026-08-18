import { NextResponse, type NextRequest } from "next/server"
import { addPoints } from "@/modules/loyalty/api/points"
import { pointsDeps } from "@/modules/loyalty/lib/default-deps"
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

  let body: {
    customerId?: string
    rangeIndex?: number
    force?: boolean
    expectedPoints?: number
  }
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

  if (body.rangeIndex === undefined || body.rangeIndex === null) {
    return NextResponse.json(
      { error: "rangeIndex es requerido." },
      { status: 400 }
    )
  }

  const rangeIndex = Number(body.rangeIndex)
  if (!Number.isInteger(rangeIndex) || rangeIndex < 0) {
    return NextResponse.json({ error: "Tramo inválido." }, { status: 400 })
  }

  const result = await addPoints(pointsDeps, {
    customerId: body.customerId,
    employeeId: session.id,
    businessId: session.businessId,
    rangeIndex,
    force: Boolean(body.force),
    expectedPoints:
      body.expectedPoints === undefined || body.expectedPoints === null
        ? undefined
        : Number(body.expectedPoints),
  })

  return NextResponse.json(result.body, { status: result.status })
}
