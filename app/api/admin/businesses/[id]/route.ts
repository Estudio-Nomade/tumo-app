import { type NextRequest } from "next/server"
import { getBusinessAdmin } from "@/modules/admin/api/businesses"
import { adminBusinessesDeps } from "@/modules/admin/lib/default-deps"
import { applyJsonResult, requireAdmin } from "@/modules/admin/lib/http"

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.res
  const { id } = await ctx.params
  const result = await getBusinessAdmin(adminBusinessesDeps, {
    businessId: id,
  })
  return applyJsonResult(result)
}
