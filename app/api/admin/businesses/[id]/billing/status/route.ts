import { type NextRequest } from "next/server"
import { setBillingStatus } from "@/modules/admin/api/billing"
import { adminBillingDeps } from "@/modules/admin/lib/default-deps"
import { applyJsonResult, requireAdmin } from "@/modules/admin/lib/http"

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.res
  const { id } = await ctx.params
  let body: { status?: string }
  try {
    body = (await req.json()) as { status?: string }
  } catch {
    return applyJsonResult({ status: 400, body: { error: "JSON inválido." } })
  }
  const result = await setBillingStatus(adminBillingDeps, {
    businessId: id,
    status: body.status,
  })
  return applyJsonResult(result)
}
