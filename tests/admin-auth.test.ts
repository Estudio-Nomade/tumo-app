import { beforeEach, describe, expect, mock, test } from "bun:test"
import {
  handleAdminLogout,
  handleAdminMe,
  handleAdminSendCode,
  handleAdminVerifyCode,
  type AdminAuthDeps,
} from "@/modules/admin/api/auth"
import {
  parseAdminAllowlist,
  isAdminPhoneAllowed,
} from "@/modules/admin/lib/allowlist"
import {
  canSendCode,
  canVerify,
  recordSend,
  recordVerifyAttempt,
  resetVerifyAttempts,
  _resetAdminRateLimitForTests,
} from "@/modules/admin/lib/rate-limit"
import {
  ADMIN_SESSION_COOKIE,
  DEV_OTP_CODE,
  DEV_OTP_MASK,
} from "@/modules/admin/lib/types"

const ALLOWED = "5491112345678"

function makeDeps(overrides: Partial<AdminAuthDeps> = {}): AdminAuthDeps {
  return {
    sql: mock(() =>
      Promise.resolve([{ id: "admin-1", phone: ALLOWED, name: null }])
    ) as AdminAuthDeps["sql"],
    sendOtp: mock(() => Promise.resolve({ maskId: "mask-1" })),
    verifyOtp: mock(() => Promise.resolve({ success: true as const })),
    isPhoneAllowed: (phone) => isAdminPhoneAllowed(phone, [ALLOWED]),
    skipAuthyo: false,
    canSendCode,
    recordSend,
    canVerify,
    recordVerifyAttempt,
    resetVerifyAttempts,
    ...overrides,
  }
}

describe("parseAdminAllowlist", () => {
  test("CSV + singular alias", () => {
    const list = parseAdminAllowlist({
      TUMO_ADMIN_PHONES: "+54 9 11 1111-1111, 5492222222222",
      TUMO_ADMIN_PHONE: "+5493333333333",
    } as NodeJS.ProcessEnv)
    expect(list).toContain("5491111111111")
    expect(list).toContain("5492222222222")
    expect(list).toContain("5493333333333")
  })
})

describe("handleAdminSendCode", () => {
  beforeEach(() => _resetAdminRateLimitForTests())

  test("403 si phone no está en allowlist", async () => {
    const deps = makeDeps()
    const result = await handleAdminSendCode(deps, {
      phone: "+5491199999999",
    })
    expect(result.status).toBe(403)
    expect(deps.sendOtp).not.toHaveBeenCalled()
  })

  test("200 y maskId si allowlist + OTP", async () => {
    const deps = makeDeps()
    const result = await handleAdminSendCode(deps, { phone: `+${ALLOWED}` })
    expect(result).toEqual({ status: 200, body: { maskId: "mask-1" } })
    expect(deps.sendOtp).toHaveBeenCalled()
  })

  test("SKIP_AUTHYO devuelve mask fijo", async () => {
    const deps = makeDeps({ skipAuthyo: true })
    const result = await handleAdminSendCode(deps, { phone: `+${ALLOWED}` })
    expect(result).toEqual({ status: 200, body: { maskId: DEV_OTP_MASK } })
    expect(deps.sendOtp).not.toHaveBeenCalled()
  })

  test("400 sin phone", async () => {
    const deps = makeDeps()
    const result = await handleAdminSendCode(deps, {})
    expect(result.status).toBe(400)
  })
})

describe("handleAdminVerifyCode", () => {
  beforeEach(() => _resetAdminRateLimitForTests())

  test("403 phone no allowlist", async () => {
    const deps = makeDeps()
    const result = await handleAdminVerifyCode(deps, {
      phone: "+5491100000000",
      maskId: "m",
      code: "123456",
    })
    expect(result.status).toBe(403)
  })

  test("200 setCookie admin_session_token", async () => {
    const deps = makeDeps()
    const result = await handleAdminVerifyCode(deps, {
      phone: `+${ALLOWED}`,
      maskId: "mask-1",
      code: "123456",
    })
    expect(result.status).toBe(200)
    expect(result.setCookie?.name).toBe(ADMIN_SESSION_COOKIE)
    expect(result.setCookie?.value).toBeTruthy()
    expect(result.body).toMatchObject({ success: true, redirect: "/admin" })
  })

  test("SKIP_AUTHYO acepta 000000 con mask dev", async () => {
    const deps = makeDeps({ skipAuthyo: true })
    const result = await handleAdminVerifyCode(deps, {
      phone: `+${ALLOWED}`,
      maskId: DEV_OTP_MASK,
      code: DEV_OTP_CODE,
    })
    expect(result.status).toBe(200)
    expect(result.setCookie?.name).toBe(ADMIN_SESSION_COOKIE)
  })

  test("SKIP_AUTHYO rechaza código incorrecto", async () => {
    const deps = makeDeps({ skipAuthyo: true })
    const result = await handleAdminVerifyCode(deps, {
      phone: `+${ALLOWED}`,
      maskId: DEV_OTP_MASK,
      code: "111111",
    })
    expect(result.status).toBe(401)
  })
})

describe("handleAdminMe / logout", () => {
  test("me 401 sin token", async () => {
    const deps = makeDeps({
      sql: mock(() => Promise.resolve([])) as AdminAuthDeps["sql"],
    })
    const result = await handleAdminMe(deps, {})
    expect(result.status).toBe(401)
  })

  test("logout limpia cookie", async () => {
    const deps = makeDeps({
      sql: mock(() => Promise.resolve([])) as AdminAuthDeps["sql"],
    })
    const result = await handleAdminLogout(deps, { token: "tok" })
    expect(result.status).toBe(200)
    expect(result.clearCookie).toBe(ADMIN_SESSION_COOKIE)
  })
})
