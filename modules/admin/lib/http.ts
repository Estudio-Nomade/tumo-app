import { NextResponse, type NextRequest } from "next/server"
import { validateAdminSession } from "@/modules/admin/lib/session"
import {
  ADMIN_SESSION_COOKIE,
  type AdminSessionUser,
  type JsonResult,
  type SqlTagged,
} from "@/modules/admin/lib/types"
import { sql } from "@/shell/db/pool"

const taggedSql = sql as unknown as SqlTagged

export function applyJsonResult(result: JsonResult): NextResponse {
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
  if (result.clearCookie) {
    res.cookies.set(result.clearCookie, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })
  }
  return res
}

export async function requireAdmin(
  req: NextRequest
): Promise<
  { ok: true; user: AdminSessionUser; token: string } | { ok: false; res: NextResponse }
> {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? ""
  if (!token) {
    return {
      ok: false,
      res: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
    }
  }
  const user = await validateAdminSession(token, taggedSql)
  if (!user) {
    return {
      ok: false,
      res: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
    }
  }
  return { ok: true, user, token }
}
