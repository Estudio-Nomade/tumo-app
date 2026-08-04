import { afterEach, describe, expect, mock, test } from "bun:test"
import { sendOtp, verifyOtp } from "@/shell/auth/authyo"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  mock.restore()
})

function mockJsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
  return mock(() =>
    Promise.resolve({
      ok,
      status,
      json: async () => body,
    } as Response)
  )
}

describe("sendOtp", () => {
  test("caso feliz: devuelve maskId", async () => {
    globalThis.fetch = mockJsonResponse({
      success: true,
      message: "submited successfully",
      data: {
        isTried: 1,
        isSent: 1,
        results: [{ success: true, maskId: "mask-123" }],
      },
    })

    const result = await sendOtp("+5491112345678")
    expect(result).toEqual({ maskId: "mask-123" })
  })

  test("error de Authyo: success false", async () => {
    globalThis.fetch = mockJsonResponse({
      success: false,
      message: "invalid phone",
    })

    const result = await sendOtp("+5491112345678")
    expect(result).toEqual({ error: "invalid phone" })
  })

  test("sin maskId en results", async () => {
    globalThis.fetch = mockJsonResponse({
      success: true,
      message: "ok",
      data: { results: [] },
    })

    const result = await sendOtp("+5491112345678")
    expect(result).toEqual({ error: "ok" })
  })

  test("error de red", async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error("network down")))

    const result = await sendOtp("+5491112345678")
    expect(result).toEqual({
      error: "No pudimos mandar el código. Probá de nuevo.",
    })
  })

  test("URL y query params correctos", async () => {
    const fetchMock = mockJsonResponse({
      success: true,
      data: { results: [{ maskId: "m1" }] },
    })
    globalThis.fetch = fetchMock

    await sendOtp("+5491187654321")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      "https://app.authyo.io/api/v1/auth/sendotp"
    )
    expect(calledUrl.searchParams.get("to")).toBe("+5491187654321")
    expect(calledUrl.searchParams.get("expiry")).toBe("300")
    expect(calledUrl.searchParams.get("otpLength")).toBe("6")
    expect(calledUrl.searchParams.get("authWay")).toBe("WhatsApp")
    expect(init.method).toBe("GET")
  })
})

describe("verifyOtp", () => {
  test("caso feliz: success true", async () => {
    globalThis.fetch = mockJsonResponse({
      success: true,
      status: "ok",
      message: "verified",
    })

    const result = await verifyOtp("mask-1", "123456")
    expect(result).toEqual({ success: true })
  })

  test('success: "true" (string)', async () => {
    globalThis.fetch = mockJsonResponse({
      success: "true",
      message: "ok",
    })

    const result = await verifyOtp("mask-1", "123456")
    expect(result).toEqual({ success: true })
  })

  test('status: "verified"', async () => {
    globalThis.fetch = mockJsonResponse({
      success: false,
      status: "verified",
      message: "ok",
    })

    const result = await verifyOtp("mask-1", "123456")
    expect(result).toEqual({ success: true })
  })

  test("OTP inválido", async () => {
    globalThis.fetch = mockJsonResponse({
      success: false,
      message: "invalid otp",
    })

    const result = await verifyOtp("mask-1", "000000")
    expect(result).toEqual({ success: false, error: "invalid otp" })
  })

  test("OTP expirado", async () => {
    globalThis.fetch = mockJsonResponse({
      success: false,
      message: "otp expired",
    })

    const result = await verifyOtp("mask-1", "123456")
    expect(result).toEqual({ success: false, error: "otp expired" })
  })

  test("error de red", async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error("timeout")))

    const result = await verifyOtp("mask-1", "123456")
    expect(result).toEqual({
      success: false,
      error: "No pudimos verificar el código. Probá de nuevo.",
    })
  })

  test("URL y query params correctos", async () => {
    const fetchMock = mockJsonResponse({ success: true })
    globalThis.fetch = fetchMock

    await verifyOtp("mask-xyz", "654321")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      "https://app.authyo.io/api/v1/auth/verifyotp"
    )
    expect(calledUrl.searchParams.get("maskId")).toBe("mask-xyz")
    expect(calledUrl.searchParams.get("otp")).toBe("654321")
    expect(init.method).toBe("GET")
  })
})
