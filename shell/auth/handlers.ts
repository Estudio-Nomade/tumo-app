import { normalizePhone, toE164 } from "@/lib/phone"
import type { Business } from "@/lib/modules"
import type { Employee } from "@/shell/db/employee"
import type { SessionEmployee } from "@/shell/auth/session"

export type AuthDeps = {
  getBusiness: (slug: string) => Promise<Business | null>
  getEmployeeByPhone: (
    phone: string,
    businessId: string
  ) => Promise<Employee | null>
  sendOtp: (
    phone: string
  ) => Promise<{ maskId: string } | { error: string }>
  verifyOtp: (
    maskId: string,
    code: string
  ) => Promise<{ success: true } | { success: false; error: string }>
  createSession: (employeeId: string) => Promise<string>
  validateSession: (token: string) => Promise<SessionEmployee | null>
  deleteSession: (token: string) => Promise<void>
  canSendCode: (phone: string, slug: string) => boolean
  recordSend: (phone: string, slug: string) => void
  resetVerifyAttempts: (phone: string, slug: string) => void
  canVerify: (phone: string, slug: string) => boolean
  recordVerifyAttempt: (phone: string, slug: string) => void
}

export type JsonResult = {
  status: number
  body: Record<string, unknown>
  setCookie?: { name: string; value: string; maxAge: number }
}

export async function handleSendCode(
  deps: AuthDeps,
  input: { phone?: string; slug?: string }
): Promise<JsonResult> {
  const phoneDigits = normalizePhone(input.phone ?? "")
  const phone = toE164(input.phone ?? "")
  const slug = input.slug?.trim() ?? ""

  if (!phoneDigits || !slug) {
    return { status: 400, body: { error: "Ingresá tu WhatsApp." } }
  }

  if (!deps.canSendCode(phoneDigits, slug)) {
    return {
      status: 429,
      body: { error: "Esperá un minuto antes de pedir otro código." },
    }
  }

  const business = await deps.getBusiness(slug)
  if (!business) {
    return { status: 404, body: { error: "Negocio no encontrado" } }
  }

  const employee = await deps.getEmployeeByPhone(phoneDigits, business.id)
  if (!employee) {
    return {
      status: 404,
      body: { error: "Ese número no está registrado en este negocio." },
    }
  }

  const result = await deps.sendOtp(phone)
  if ("error" in result) {
    return { status: 500, body: { error: result.error } }
  }

  deps.recordSend(phoneDigits, slug)
  deps.resetVerifyAttempts(phoneDigits, slug)

  return { status: 200, body: { maskId: result.maskId } }
}

export async function handleVerifyCode(
  deps: AuthDeps,
  input: { phone?: string; slug?: string; maskId?: string; code?: string }
): Promise<JsonResult> {
  const phoneDigits = normalizePhone(input.phone ?? "")
  const slug = input.slug?.trim() ?? ""
  const maskId = input.maskId?.trim() ?? ""
  const code = input.code?.trim() ?? ""

  if (!phoneDigits || !slug || !maskId || !code) {
    return { status: 400, body: { error: "Datos incompletos." } }
  }

  if (!deps.canVerify(phoneDigits, slug)) {
    return {
      status: 429,
      body: { error: "Demasiados intentos. Pedí un código nuevo." },
    }
  }

  const business = await deps.getBusiness(slug)
  if (!business) {
    return { status: 404, body: { error: "Negocio no encontrado" } }
  }

  deps.recordVerifyAttempt(phoneDigits, slug)

  const otpResult = await deps.verifyOtp(maskId, code)
  if (!otpResult.success) {
    return { status: 401, body: { error: otpResult.error } }
  }

  const employee = await deps.getEmployeeByPhone(phoneDigits, business.id)
  if (!employee) {
    return { status: 500, body: { error: "Error interno." } }
  }

  const token = await deps.createSession(employee.id)
  const SESSION_MAX_AGE = 30 * 24 * 60 * 60

  return {
    status: 200,
    body: {
      success: true,
      redirect: `/${slug}/dashboard`,
      role: employee.role,
    },
    setCookie: {
      name: "session_token",
      value: token,
      maxAge: SESSION_MAX_AGE,
    },
  }
}

export async function handleLogout(
  deps: AuthDeps,
  token: string | undefined
): Promise<JsonResult> {
  if (token) {
    await deps.deleteSession(token)
  }

  return {
    status: 200,
    body: { success: true },
    setCookie: { name: "session_token", value: "", maxAge: 0 },
  }
}

export async function handleMe(
  deps: AuthDeps,
  token: string | undefined
): Promise<JsonResult> {
  if (!token) {
    return { status: 401, body: { error: "No autenticado." } }
  }

  const session = await deps.validateSession(token)
  if (!session) {
    return { status: 401, body: { error: "No autenticado." } }
  }

  return {
    status: 200,
    body: { name: session.name, role: session.role },
  }
}
