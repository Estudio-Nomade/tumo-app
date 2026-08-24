import { describe, expect, test } from "bun:test"
import { MP_SLOW_AFTER_MS, mpTimeoutHint } from "@/modules/orders/lib/mp-timeout"

describe("mpTimeoutHint", () => {
  test("antes del umbral no avisa (null)", () => {
    expect(mpTimeoutHint(0)).toBeNull()
    expect(mpTimeoutHint(MP_SLOW_AFTER_MS - 1000)).toBeNull()
  })

  test("al superar el umbral avisa que está tardando", () => {
    expect(mpTimeoutHint(MP_SLOW_AFTER_MS)).not.toBeNull()
    expect(mpTimeoutHint(MP_SLOW_AFTER_MS + 60000)).not.toBeNull()
  })

  test("el mensaje es lenguaje llano y menciona qué puede hacer", () => {
    const hint = mpTimeoutHint(MP_SLOW_AFTER_MS)
    expect(hint).toMatch(/tardando/)
  })
})
