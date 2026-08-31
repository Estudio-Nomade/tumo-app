import { NextResponse, type NextRequest } from "next/server"
import {
  isAdminProtectedPath,
  shouldRedirectAdminToLogin,
} from "@/modules/admin/lib/proxy-guard"
import { ADMIN_SESSION_COOKIE } from "@/modules/admin/lib/types"

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  if (pathname.startsWith("/admin")) {
    const adminToken = req.cookies.get(ADMIN_SESSION_COOKIE)?.value
    if (
      shouldRedirectAdminToLogin(pathname, Boolean(adminToken)) ||
      (isAdminProtectedPath(pathname) && !adminToken)
    ) {
      return NextResponse.redirect(new URL("/admin/login", req.url))
    }
    return NextResponse.next()
  }

  const token = req.cookies.get("session_token")?.value
  if (token) {
    return NextResponse.next()
  }

  const segments = pathname.split("/").filter(Boolean)
  const slug = segments[0] ?? ""

  if (!slug) {
    return NextResponse.next()
  }

  const loginUrl = new URL(`/${slug}/login`, req.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    "/:slug/dashboard",
    "/:slug/dashboard/:path*",
    "/admin",
    "/admin/:path*",
  ],
}
