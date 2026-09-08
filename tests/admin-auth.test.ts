import { beforeEach, describe, expect, mock, test } from "bun:test"
import {
  handleAdminLogout,
  handleAdminMe,
  handleAdminSendCode,
  handleAdminVerifyCode,
  type AdminAuthDeps,
} from "@/modules/admin/api/auth"
import {
  canSendCode,
  canVerify,
  recordSend,
  recordVerifyAttempt,
  resetVerifyAttempts,
  _resetAdminRateLimitForTests,
} from "@/modules/admin/lib/rate-limit"
import {
  findAdminUserByPhone,
} from "@/modules/admin/lib/session"
import {
  ADMIN_SESSION_COOKIE,
  DEV_OTP_CODE,
  DEV_OTP_MASK,
  type AdminSessionUser,
  type SqlTagged,
} from "@/modules/admin/lib/types"

const ALLOWED = "5491112345678"
const ADMIN_ROW: AdminSessionUser = {
  id: "admin-1",
  phone: ALLOWED,
  name: null,
}

function makeDeps(overrides: Partial<AdminAuthDeps> = {}): AdminAuthDeps {
  return {
    sql: mock(() =>
      Promise.resolve([{ id: "session-tok" }])
    ) as AdminAuthDeps["sql"],
    sendOtp: mock(() => Promise.resolve({ maskId: "mask-1" })),
    verifyOtp: mock(() => Promise.resolve({ success: true as const })),
    findAdminByPhone: mock(async (phone: string) =>
      phone.includes(ALLOWED) || phone === ALLOWED ? ADMIN_ROW : null
    ),
    skipAuthyo: false,
    canSendCode,
    recordSend,
    canVerify,
    recordVerifyAttempt,
    resetVerifyAttempts,
    ...overrides,
  }
}

describe("findAdminUserByPhone", () => {
  test("encuentra por digits exactos", async () => {
    const sqlMock = mock(() => Promise.resolve([ADMIN_ROW]))
    const found = await findAdminUserByPhone(
      `+${ALLOWED}`,
      sqlMock as unknown as SqlTagged
    )
    expect(found).toEqual(ADMIN_ROW)
  })

  test("null si no hay match", async () => {
    const sqlMock = mock(() =>
      Promise.resolve([{ id: "x", phone: "5490000000000", name: null }])
    )
    const found = await findAdminUserByPhone(
      "+5491199999999",
      sqlMock as unknown as SqlTagged
    )
    expect(found).toBeNull()
  })

  test("match flexible con phonesMatch (formato distinto)", async () => {
    const sqlMock = mock(() =>
      Promise.resolve([{ id: "a", phone: "5491112345678", name: "Yo" }])
    )
    const found = await findAdminUserByPhone(
      "+54 9 11 1234-5678",
      sqlMock as unknown as SqlTagged
    )
    expect(found?.id).toBe("a")
  })
})

describe("handleAdminSendCode", () => {
  beforeEach(() => _resetAdminRateLimitForTests())

  test("403 si phone no está en admin_users", async () => {
    const deps = makeDeps({
      findAdminByPhone: mock(async () => null),
    })
    const result = await handleAdminSendCode(deps, {
      phone: "+5491199999999",
    })
    expect(result.status).toBe(403)
    expect(deps.sendOtp).not.toHaveBeenCalled()
  })

  test("200 y maskId si existe en admin_users + OTP", async () => {
    const deps = makeDeps()
    const result = await handleAdminSendCode(deps, { phone: `+${ALLOWED}` })
    expect(result).toEqual({ status: 200, body: { maskId: "mask-1" } })
    expect(deps.sendOtp).toHaveBeenCalled()
    expect(deps.findAdminByPhone).toHaveBeenCalled()
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

  test("403 phone no en admin_users", async () => {
    const deps = makeDeps({
      findAdminByPhone: mock(async () => null),
    })
    const result = await handleAdminVerifyCode(deps, {
      phone: "+5491100000000",
      maskId: "m",
      code: "123456",
    })
    expect(result.status).toBe(403)
  })

  test("200 setCookie admin_session_token sin crear admin nuevo", async () => {
    const insertCalls: unknown[][] = []
    const sqlMock = mock((...args: unknown[]) => {
      insertCalls.push(args)
      return Promise.resolve([])
    })
    const deps = makeDeps({
      sql: sqlMock as unknown as AdminAuthDeps["sql"],
    })
    const result = await handleAdminVerifyCode(deps, {
      phone: `+${ALLOWED}`,
      maskId: "mask-1",
      code: "123456",
    })
    expect(result.status).toBe(200)
    expect(result.setCookie?.name).toBe(ADMIN_SESSION_COOKIE)
    expect(result.setCookie?.value).toBeTruthy()
    expect(result.body).toMatchObject({ success: true, redirect: "/admin" })
    const serialized = JSON.stringify(insertCalls)
    expect(serialized).not.toContain("admin_users")
    expect(serialized).toContain("admin-1")
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
