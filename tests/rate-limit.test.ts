import { beforeEach, describe, expect, test } from "bun:test"
import {
  canSendCode,
  recordSend,
  canVerify,
  recordVerifyAttempt,
  resetVerifyAttempts,
  _resetAllForTests,
} from "@/shell/auth/rate-limit"

describe("rate-limit send", () => {
  beforeEach(() => {
    _resetAllForTests()
  })

  test("permite el primer envío", () => {
    expect(canSendCode("+54911", "demo")).toBe(true)
  })

  test("bloquea si el último envío fue hace menos de 60s", () => {
    recordSend("+54911", "demo")
    expect(canSendCode("+54911", "demo")).toBe(false)
  })

  test("permite después de 60s", () => {
    recordSend("+54911", "demo", Date.now() - 61_000)
    expect(canSendCode("+54911", "demo")).toBe(true)
  })
})

describe("rate-limit verify", () => {
  beforeEach(() => {
    _resetAllForTests()
  })

  test("permite hasta 5 intentos en 5 minutos", () => {
    for (let i = 0; i < 5; i++) {
      expect(canVerify("+54911", "demo")).toBe(true)
      recordVerifyAttempt("+54911", "demo")
    }
    expect(canVerify("+54911", "demo")).toBe(false)
  })

  test("resetVerifyAttempts limpia el contador", () => {
    for (let i = 0; i < 5; i++) {
      recordVerifyAttempt("+54911", "demo")
    }
    resetVerifyAttempts("+54911", "demo")
    expect(canVerify("+54911", "demo")).toBe(true)
  })
})
