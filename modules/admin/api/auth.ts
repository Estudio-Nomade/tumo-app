import { normalizePhone, toE164 } from "@/lib/phone"
import {
  isAdminPhoneAllowed,
  parseAdminAllowlist,
} from "@/modules/admin/lib/allowlist"
import type { JsonResult, SqlTagged } from "@/modules/admin/lib/types"
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  DEV_OTP_CODE,
  DEV_OTP_MASK,
} from "@/modules/admin/lib/types"
import {
  createAdminSession,
  deleteAdminSession,
  upsertAdminUser,
  validateAdminSession,
} from "@/modules/admin/lib/session"

export type AdminAuthDeps = {
  sql: SqlTagged
  sendOtp: (
    phone: string
  ) => Promise<{ maskId: string } | { error: string }>
  verifyOtp: (
    maskId: string,
    code: string
  ) => Promise<{ success: true } | { success: false; error: string }>
  isPhoneAllowed?: (phone: string) => boolean
  skipAuthyo?: boolean
  canSendCode: (phone: string) => boolean
  recordSend: (phone: string) => void
  canVerify: (phone: string) => boolean
  recordVerifyAttempt: (phone: string) => void
  resetVerifyAttempts: (phone: string) => void
}

export async function handleAdminSendCode(
  deps: AdminAuthDeps,
  input: { phone?: string }
): Promise<JsonResult> {
  const phoneDigits = normalizePhone(input.phone ?? "")
  const phone = toE164(input.phone ?? "")

  if (!phoneDigits) {
    return { status: 400, body: { error: "Ingresá tu WhatsApp." } }
  }

  const allowed =
    deps.isPhoneAllowed?.(phoneDigits) ?? isAdminPhoneAllowed(phoneDigits)
  if (!allowed) {
    return {
      status: 403,
      body: { error: "Ese número no tiene acceso al panel admin." },
    }
  }

  if (!deps.canSendCode(phoneDigits)) {
    return {
      status: 429,
      body: { error: "Esperá un minuto antes de pedir otro código." },
    }
  }

  if (deps.skipAuthyo) {
    deps.recordSend(phoneDigits)
    deps.resetVerifyAttempts(phoneDigits)
    return { status: 200, body: { maskId: DEV_OTP_MASK } }
  }

  const result = await deps.sendOtp(phone)
  if ("error" in result) {
    return { status: 500, body: { error: result.error } }
  }

  deps.recordSend(phoneDigits)
  deps.resetVerifyAttempts(phoneDigits)
  return { status: 200, body: { maskId: result.maskId } }
}

export async function handleAdminVerifyCode(
  deps: AdminAuthDeps,
  input: { phone?: string; maskId?: string; code?: string }
): Promise<JsonResult> {
  const phoneDigits = normalizePhone(input.phone ?? "")
  const maskId = input.maskId?.trim() ?? ""
  const code = input.code?.trim() ?? ""

  if (!phoneDigits || !maskId || !code) {
    return { status: 400, body: { error: "Datos incompletos." } }
  }

  const allowed =
    deps.isPhoneAllowed?.(phoneDigits) ?? isAdminPhoneAllowed(phoneDigits)
  if (!allowed) {
    return {
      status: 403,
      body: { error: "Ese número no tiene acceso al panel admin." },
    }
  }

  if (!deps.canVerify(phoneDigits)) {
    return {
      status: 429,
      body: { error: "Demasiados intentos. Pedí un código nuevo." },
    }
  }

  deps.recordVerifyAttempt(phoneDigits)

  if (deps.skipAuthyo) {
    if (maskId !== DEV_OTP_MASK || code !== DEV_OTP_CODE) {
      return { status: 401, body: { error: "El código no es válido." } }
    }
  } else {
    const otpResult = await deps.verifyOtp(maskId, code)
    if (!otpResult.success) {
      return { status: 401, body: { error: otpResult.error } }
    }
  }

  const user = await upsertAdminUser(phoneDigits, null, deps.sql)
  const token = await createAdminSession(user.id, deps.sql)

  return {
    status: 200,
    body: { success: true, redirect: "/admin" },
    setCookie: {
      name: ADMIN_SESSION_COOKIE,
      value: token,
      maxAge: ADMIN_SESSION_MAX_AGE,
    },
  }
}

export async function handleAdminLogout(
  deps: Pick<AdminAuthDeps, "sql">,
  input: { token?: string }
): Promise<JsonResult> {
  const token = input.token?.trim() ?? ""
  if (token) {
    await deleteAdminSession(token, deps.sql)
  }
  return {
    status: 200,
    body: { success: true },
    clearCookie: ADMIN_SESSION_COOKIE,
  }
}

export async function handleAdminMe(
  deps: Pick<AdminAuthDeps, "sql">,
  input: { token?: string }
): Promise<JsonResult> {
  const token = input.token?.trim() ?? ""
  if (!token) {
    return { status: 401, body: { error: "No autenticado." } }
  }
  const user = await validateAdminSession(token, deps.sql)
  if (!user) {
    return { status: 401, body: { error: "No autenticado." } }
  }
  return {
    status: 200,
    body: { id: user.id, phone: user.phone, name: user.name },
  }
}

export { parseAdminAllowlist, isAdminPhoneAllowed }
