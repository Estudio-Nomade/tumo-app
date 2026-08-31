import { type NextRequest } from "next/server"
import { handleAdminMe } from "@/modules/admin/api/auth"
import { adminAuthDeps } from "@/modules/admin/lib/default-deps"
import { applyJsonResult } from "@/modules/admin/lib/http"
import { ADMIN_SESSION_COOKIE } from "@/modules/admin/lib/types"

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const result = await handleAdminMe(adminAuthDeps, { token })
  return applyJsonResult(result)
}
