import { NextResponse, type NextRequest } from "next/server"
import { getSuggestions } from "@/modules/orders/api/geocode"
import { ORDERS_GEO_BIAS } from "@/modules/orders/lib/photon"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? ""
  // slug reserved for future per-business bias; v1 uses ORDERS_GEO_BIAS
  void req.nextUrl.searchParams.get("slug")

  const results = await getSuggestions(
    { fetch: globalThis.fetch.bind(globalThis) },
    { q, bias: ORDERS_GEO_BIAS }
  )
  return NextResponse.json({ results })
}
