import { NextResponse, type NextRequest } from "next/server"
import {
  parseProgramUpdate,
  updateProgram,
} from "@/modules/loyalty/api/program"
import { updateBusinessProgram } from "@/shell/db/business"
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const parsed = parseProgramUpdate(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const result = await updateProgram(
    { updateProgramRow: updateBusinessProgram },
    {
      businessId: session.businessId,
      role: session.role,
      patch: parsed.value,
    }
  )

  return NextResponse.json(result.body, { status: result.status })
}
