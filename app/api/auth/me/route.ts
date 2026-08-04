import { NextResponse, type NextRequest } from "next/server"
import { defaultAuthDeps } from "@/shell/auth/default-deps"
import { handleMe } from "@/shell/auth/handlers"

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value
  const result = await handleMe(defaultAuthDeps, token)
  return NextResponse.json(result.body, { status: result.status })
}
