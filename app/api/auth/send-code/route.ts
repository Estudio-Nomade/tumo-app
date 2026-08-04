import { NextResponse, type NextRequest } from "next/server"
import { defaultAuthDeps } from "@/shell/auth/default-deps"
import { handleSendCode } from "@/shell/auth/handlers"

export async function POST(req: NextRequest) {
  let body: { phone?: string; slug?: string }
  try {
    body = (await req.json()) as { phone?: string; slug?: string }
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const result = await handleSendCode(defaultAuthDeps, body)
  return NextResponse.json(result.body, { status: result.status })
}
