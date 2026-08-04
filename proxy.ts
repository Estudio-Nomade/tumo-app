import { NextResponse, type NextRequest } from "next/server"

export function proxy(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value
  if (token) {
    return NextResponse.next()
  }

  const pathname = req.nextUrl.pathname
  const segments = pathname.split("/").filter(Boolean)
  const slug = segments[0] ?? ""

  if (!slug) {
    return NextResponse.next()
  }

  const loginUrl = new URL(`/${slug}/login`, req.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/:slug/dashboard", "/:slug/dashboard/:path*"],
}
