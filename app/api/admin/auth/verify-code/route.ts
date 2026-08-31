import { type NextRequest } from "next/server"
import { handleAdminVerifyCode } from "@/modules/admin/api/auth"
import { adminAuthDeps } from "@/modules/admin/lib/default-deps"
import { applyJsonResult } from "@/modules/admin/lib/http"

export async function POST(req: NextRequest) {
  let body: { phone?: string; maskId?: string; code?: string }
  try {
    body = (await req.json()) as {
      phone?: string
      maskId?: string
      code?: string
    }
  } catch {
    return applyJsonResult({ status: 400, body: { error: "JSON inválido." } })
  }
  const result = await handleAdminVerifyCode(adminAuthDeps, body)
  return applyJsonResult(result)
}
