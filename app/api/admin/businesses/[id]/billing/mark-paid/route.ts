import { type NextRequest } from "next/server"
import { markPaid } from "@/modules/admin/api/billing"
import { adminBillingDeps } from "@/modules/admin/lib/default-deps"
import { applyJsonResult, requireAdmin } from "@/modules/admin/lib/http"

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.res
  const { id } = await ctx.params
  let body: { amountCents?: number; note?: string } = {}
  try {
    body = (await req.json()) as { amountCents?: number; note?: string }
  } catch {
    body = {}
  }
  const result = await markPaid(adminBillingDeps, {
    businessId: id,
    amountCents: body.amountCents,
    note: body.note,
    adminUserId: auth.user.id,
  })
  return applyJsonResult(result)
}
