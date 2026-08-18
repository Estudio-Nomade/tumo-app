import { NextResponse, type NextRequest } from "next/server"
import {
  getCustomer,
  listCustomers,
  registerCustomer,
} from "@/modules/loyalty/api/customers"
import { customerDeps } from "@/modules/loyalty/lib/default-deps"
import { validateSession } from "@/shell/auth/session"
import { getBusinessById } from "@/shell/db/business"

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
  const wantsList = searchParams.get("list") === "1"

  if (wantsList) {
    const token = req.cookies.get("session_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 })
    }
    const session = await validateSession(token)
    if (!session) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 })
    }

    const business = await getBusinessById(session.businessId)
    if (!business) {
      return NextResponse.json(
        { error: "Negocio no encontrado" },
        { status: 404 }
      )
    }

    const limit = Number(searchParams.get("limit") ?? "100")
    const result = await listCustomers(customerDeps, {
      businessId: session.businessId,
      pointsNeeded: business.points_needed,
      pointRanges: business.point_ranges,
      rewardName: business.reward_name,
      query: searchParams.get("q") ?? undefined,
      limit: Number.isFinite(limit) ? limit : 100,
    })
    return NextResponse.json(result.body, { status: result.status })
  }

  const result = await getCustomer(customerDeps, {
    code: searchParams.get("code") ?? undefined,
    phone: searchParams.get("phone") ?? undefined,
    id: searchParams.get("id") ?? undefined,
    slug: searchParams.get("slug") ?? "",
  })

  const res = NextResponse.json(result.body, { status: result.status })
  // Only set public client cookie when there is no employee session
  // (staff lookups must not hijack the browser's customer card identity).
  const staffToken = req.cookies.get("session_token")?.value
  const staffSession = staffToken ? await validateSession(staffToken) : null
  if (
    result.status === 200 &&
    typeof result.body.id === "string" &&
    !staffSession
  ) {
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
