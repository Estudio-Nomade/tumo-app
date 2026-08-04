import { NextResponse, type NextRequest } from "next/server"
import { defaultAuthDeps } from "@/shell/auth/default-deps"
import { handleVerifyCode } from "@/shell/auth/handlers"

export async function POST(req: NextRequest) {
  let body: {
    phone?: string
    slug?: string
    maskId?: string
    code?: string
  }
  try {
    body = (await req.json()) as {
      phone?: string
      slug?: string
      maskId?: string
      code?: string
    }
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const result = await handleVerifyCode(defaultAuthDeps, body)
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
