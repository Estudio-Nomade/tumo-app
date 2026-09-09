import { type NextRequest } from "next/server"
import { activateModule } from "@/modules/admin/api/module-subscriptions"
import { adminModulesDeps } from "@/modules/admin/lib/default-deps"
import { applyJsonResult, requireAdmin } from "@/modules/admin/lib/http"

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; moduleId: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.res
  const { id, moduleId } = await ctx.params
  let body: { activatedAt?: string; billingAnchorAt?: string } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    body = {}
  }
  const result = await activateModule(
    { ...adminModulesDeps, now: () => new Date() },
    {
      businessId: id,
      moduleId,
      activatedAt: body.activatedAt,
      billingAnchorAt: body.billingAnchorAt,
    }
  )
  return applyJsonResult(result)
}
