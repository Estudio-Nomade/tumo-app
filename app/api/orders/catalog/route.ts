import { NextResponse, type NextRequest } from "next/server"
import { getCatalog } from "@/modules/orders/api/catalog"
import { catalogDeps } from "@/modules/orders/lib/default-deps"

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? ""
  const clientId = req.cookies.get("client_id")?.value
  const result = await getCatalog(catalogDeps, { slug, clientId })
  return NextResponse.json(result.body, { status: result.status })
}
