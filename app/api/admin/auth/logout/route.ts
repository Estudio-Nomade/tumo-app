import { type NextRequest } from "next/server"
import { handleAdminLogout } from "@/modules/admin/api/auth"
import { adminAuthDeps } from "@/modules/admin/lib/default-deps"
import { applyJsonResult } from "@/modules/admin/lib/http"
import { ADMIN_SESSION_COOKIE } from "@/modules/admin/lib/types"

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const result = await handleAdminLogout(adminAuthDeps, { token })
  return applyJsonResult(result)
}
