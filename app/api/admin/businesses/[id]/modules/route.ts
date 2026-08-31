import { type NextRequest } from "next/server"
import { setActiveModules } from "@/modules/admin/api/modules"
import { adminModulesDeps } from "@/modules/admin/lib/default-deps"
import { applyJsonResult, requireAdmin } from "@/modules/admin/lib/http"

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.res
  const { id } = await ctx.params
  let body: { modules?: string[] }
  try {
    body = (await req.json()) as { modules?: string[] }
  } catch {
    return applyJsonResult({ status: 400, body: { error: "JSON inválido." } })
  }
  const result = await setActiveModules(adminModulesDeps, {
    businessId: id,
    modules: body.modules,
  })
  return applyJsonResult(result)
}
