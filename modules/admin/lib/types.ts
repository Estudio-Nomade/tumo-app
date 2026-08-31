export type JsonResult = {
  status: number
  body: Record<string, unknown>
  setCookie?: { name: string; value: string; maxAge: number }
  clearCookie?: string
}

export type BillingStatus = "al_dia" | "pendiente" | "vencido"

export type AdminUser = {
  id: string
  phone: string
  name: string | null
}

export type AdminSessionUser = {
  id: string
  phone: string
  name: string | null
}

export type SqlTagged = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown[]>

export const ADMIN_SESSION_COOKIE = "admin_session_token"
export const ADMIN_SESSION_MAX_AGE = 30 * 24 * 60 * 60
export const DEV_OTP_CODE = "000000"
export const DEV_OTP_MASK = "dev-admin-mask"
export const DEFAULT_MONTHLY_AMOUNT_CENTS = 1_990_000
