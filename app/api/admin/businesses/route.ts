import { type NextRequest } from "next/server"
import { listBusinesses } from "@/modules/admin/api/businesses"
import { adminBusinessesDeps } from "@/modules/admin/lib/default-deps"
import { applyJsonResult, requireAdmin } from "@/modules/admin/lib/http"

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.res
  const result = await listBusinesses(adminBusinessesDeps)
  return applyJsonResult(result)
}
