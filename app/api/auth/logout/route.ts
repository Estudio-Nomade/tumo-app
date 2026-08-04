import { NextResponse, type NextRequest } from "next/server"
import { defaultAuthDeps } from "@/shell/auth/default-deps"
import { handleLogout } from "@/shell/auth/handlers"

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value
  const result = await handleLogout(defaultAuthDeps, token)
  const res = NextResponse.json(result.body, { status: result.status })

  if (result.setCookie) {
    res.cookies.set(result.setCookie.name, result.setCookie.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: result.setCookie.maxAge,
      path: "/",
    })
  }

  return res
}
