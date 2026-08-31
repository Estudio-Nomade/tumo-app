import { sendOtp, verifyOtp } from "@/shell/auth/authyo"
import { sql } from "@/shell/db/pool"
import type { AdminAuthDeps } from "@/modules/admin/api/auth"
import type { AdminBillingDeps } from "@/modules/admin/api/billing"
import type { AdminBusinessesDeps } from "@/modules/admin/api/businesses"
import type { AdminModulesDeps } from "@/modules/admin/api/modules"
import {
  canSendCode,
  canVerify,
  recordSend,
  recordVerifyAttempt,
  resetVerifyAttempts,
} from "@/modules/admin/lib/rate-limit"
import type { SqlTagged } from "@/modules/admin/lib/types"

const taggedSql = sql as unknown as SqlTagged

export const adminAuthDeps: AdminAuthDeps = {
  sql: taggedSql,
  sendOtp,
  verifyOtp,
  skipAuthyo: process.env.SKIP_AUTHYO === "true",
  canSendCode,
  recordSend,
  canVerify,
  recordVerifyAttempt,
  resetVerifyAttempts,
}

export const adminBusinessesDeps: AdminBusinessesDeps = {
  sql: taggedSql,
}

export const adminModulesDeps: AdminModulesDeps = {
  sql: taggedSql,
}

export const adminBillingDeps: AdminBillingDeps = {
  sql: taggedSql,
}
