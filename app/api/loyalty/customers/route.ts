import { NextResponse, type NextRequest } from "next/server"
import {
  getCustomer,
  registerCustomer,
} from "@/modules/loyalty/api/customers"
import { customerDeps } from "@/modules/loyalty/lib/default-deps"

export async function POST(req: NextRequest) {
  let body: {
    name?: string
    phone?: string
    birthday?: string
    slug?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const result = await registerCustomer(customerDeps, {
    name: body.name ?? "",
    phone: body.phone ?? "",
    birthday: body.birthday,
    slug: body.slug ?? "",
  })

  const res = NextResponse.json(result.body, { status: result.status })
  if (result.status === 200 && typeof result.body.id === "string") {
    res.cookies.set("client_id", result.body.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    })
  }
  return res
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const result = await getCustomer(customerDeps, {
    code: searchParams.get("code") ?? undefined,
    phone: searchParams.get("phone") ?? undefined,
    id: searchParams.get("id") ?? undefined,
    slug: searchParams.get("slug") ?? "",
  })

  const res = NextResponse.json(result.body, { status: result.status })
  if (result.status === 200 && typeof result.body.id === "string") {
    res.cookies.set("client_id", result.body.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    })
  }
  return res
}
