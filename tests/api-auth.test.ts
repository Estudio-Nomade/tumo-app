import { beforeEach, describe, expect, mock, test } from "bun:test"
import {
  handleLogout,
  handleMe,
  handleSendCode,
  handleVerifyCode,
  type AuthDeps,
} from "@/shell/auth/handlers"
import {
  canSendCode,
  canVerify,
  recordSend,
  recordVerifyAttempt,
  resetVerifyAttempts,
  _resetAllForTests,
} from "@/shell/auth/rate-limit"

const business = {
  id: "biz-1",
  name: "Demo",
  slug: "demo",
  logo: null,
  primary_color: "#F97316",
  secondary_color: "#FACC15",
  active_modules: ["loyalty"],
  purchases_needed: 10,
  reward_name: "premio",
}

const employee = {
  id: "emp-1",
  name: "Ana",
  phone: "+5491112345678",
  role: "owner",
  business_id: "biz-1",
}

function makeDeps(overrides: Partial<AuthDeps> = {}): AuthDeps {
  return {
    getBusiness: mock(() => Promise.resolve(business)),
    getEmployeeByPhone: mock(() => Promise.resolve(employee)),
    sendOtp: mock(() => Promise.resolve({ maskId: "mask-1" })),
    verifyOtp: mock(() => Promise.resolve({ success: true as const })),
    createSession: mock(() => Promise.resolve("session-token-uuid")),
    validateSession: mock(() => Promise.resolve(null)),
    deleteSession: mock(() => Promise.resolve()),
    canSendCode: (phone, slug) => canSendCode(phone, slug),
    recordSend: (phone, slug) => recordSend(phone, slug),
    resetVerifyAttempts: (phone, slug) => resetVerifyAttempts(phone, slug),
    canVerify: (phone, slug) => canVerify(phone, slug),
    recordVerifyAttempt: (phone, slug) => recordVerifyAttempt(phone, slug),
    ...overrides,
  }
}

describe("handleSendCode", () => {
  beforeEach(() => {
    _resetAllForTests()
  })

  test("caso feliz", async () => {
    const deps = makeDeps()
    const result = await handleSendCode(deps, {
      phone: employee.phone,
      slug: "demo",
    })
    expect(result).toEqual({ status: 200, body: { maskId: "mask-1" } })
    expect(deps.sendOtp).toHaveBeenCalledWith(employee.phone)
    expect(canSendCode(employee.phone, "demo")).toBe(false)
  })

  test("negocio no encontrado", async () => {
    const deps = makeDeps({
      getBusiness: mock(() => Promise.resolve(null)),
    })
    const result = await handleSendCode(deps, {
      phone: employee.phone,
      slug: "nope",
    })
    expect(result).toEqual({
      status: 404,
      body: { error: "Negocio no encontrado" },
    })
  })

  test("empleado no encontrado", async () => {
    const deps = makeDeps({
      getEmployeeByPhone: mock(() => Promise.resolve(null)),
    })
    const result = await handleSendCode(deps, {
      phone: "+5491100000000",
      slug: "demo",
    })
    expect(result).toEqual({
      status: 404,
      body: { error: "Ese número no está registrado en este negocio." },
    })
  })

  test("Authyo falla", async () => {
    const deps = makeDeps({
      sendOtp: mock(() => Promise.resolve({ error: "falló envío" })),
    })
    const result = await handleSendCode(deps, {
      phone: employee.phone,
      slug: "demo",
    })
    expect(result).toEqual({ status: 500, body: { error: "falló envío" } })
  })

  test("rate limit", async () => {
    recordSend(employee.phone, "demo")
    const deps = makeDeps()
    const result = await handleSendCode(deps, {
      phone: employee.phone,
      slug: "demo",
    })
    expect(result).toEqual({
      status: 429,
      body: { error: "Esperá un minuto antes de pedir otro código." },
    })
  })
})

describe("handleVerifyCode", () => {
  beforeEach(() => {
    _resetAllForTests()
  })

  test("caso feliz", async () => {
    const deps = makeDeps()
    const result = await handleVerifyCode(deps, {
      phone: employee.phone,
      slug: "demo",
      maskId: "mask-1",
      code: "123456",
    })
    expect(result.status).toBe(200)
    expect(result.body).toEqual({
      success: true,
      redirect: "/demo/dashboard",
      role: "owner",
    })
    expect(result.setCookie).toEqual({
      name: "session_token",
      value: "session-token-uuid",
      maxAge: 30 * 24 * 60 * 60,
    })
    expect(deps.createSession).toHaveBeenCalledWith("emp-1")
  })

  test("código inválido", async () => {
    const deps = makeDeps({
      verifyOtp: mock(() =>
        Promise.resolve({
          success: false as const,
          error: "El código no es válido.",
        })
      ),
    })
    const result = await handleVerifyCode(deps, {
      phone: employee.phone,
      slug: "demo",
      maskId: "mask-1",
      code: "000000",
    })
    expect(result).toEqual({
      status: 401,
      body: { error: "El código no es válido." },
    })
  })

  test("negocio no encontrado", async () => {
    const deps = makeDeps({
      getBusiness: mock(() => Promise.resolve(null)),
    })
    const result = await handleVerifyCode(deps, {
      phone: employee.phone,
      slug: "nope",
      maskId: "mask-1",
      code: "123456",
    })
    expect(result.status).toBe(404)
  })

  test("empleado desapareció después del OTP", async () => {
    const deps = makeDeps({
      getEmployeeByPhone: mock(() => Promise.resolve(null)),
    })
    const result = await handleVerifyCode(deps, {
      phone: employee.phone,
      slug: "demo",
      maskId: "mask-1",
      code: "123456",
    })
    expect(result).toEqual({ status: 500, body: { error: "Error interno." } })
  })

  test("rate limit de intentos", async () => {
    for (let i = 0; i < 5; i++) {
      recordVerifyAttempt(employee.phone, "demo")
    }
    const deps = makeDeps()
    const result = await handleVerifyCode(deps, {
      phone: employee.phone,
      slug: "demo",
      maskId: "mask-1",
      code: "123456",
    })
    expect(result).toEqual({
      status: 429,
      body: { error: "Demasiados intentos. Pedí un código nuevo." },
    })
  })
})

describe("handleLogout", () => {
  test("caso feliz con cookie", async () => {
    const deps = makeDeps()
    const result = await handleLogout(deps, "tok-1")
    expect(result.status).toBe(200)
    expect(result.body).toEqual({ success: true })
    expect(deps.deleteSession).toHaveBeenCalledWith("tok-1")
    expect(result.setCookie).toEqual({
      name: "session_token",
      value: "",
      maxAge: 0,
    })
  })

  test("sin cookie es idempotente", async () => {
    const deps = makeDeps()
    const result = await handleLogout(deps, undefined)
    expect(result).toEqual({
      status: 200,
      body: { success: true },
      setCookie: { name: "session_token", value: "", maxAge: 0 },
    })
    expect(deps.deleteSession).not.toHaveBeenCalled()
  })
})

describe("handleMe", () => {
  test("caso feliz", async () => {
    const deps = makeDeps({
      validateSession: mock(() =>
        Promise.resolve({
          id: "emp-1",
          name: "Ana",
          phone: employee.phone,
          role: "owner",
          businessId: "biz-1",
        })
      ),
    })
    const result = await handleMe(deps, "tok-ok")
    expect(result).toEqual({
      status: 200,
      body: { name: "Ana", role: "owner" },
    })
  })

  test("sin cookie", async () => {
    const deps = makeDeps()
    const result = await handleMe(deps, undefined)
    expect(result.status).toBe(401)
  })

  test("sesión inválida", async () => {
    const deps = makeDeps({
      validateSession: mock(() => Promise.resolve(null)),
    })
    const result = await handleMe(deps, "bad")
    expect(result.status).toBe(401)
  })
})
