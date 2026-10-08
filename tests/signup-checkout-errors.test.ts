import { describe, expect, test } from "bun:test"
import {
  messageFromCheckoutHttp,
  NETWORK_ERROR_MESSAGE,
} from "@/modules/signup/public/checkout-client-errors"
import { jsonFromCheckoutThrow } from "@/modules/signup/lib/checkout-route-error"

describe("messageFromCheckoutHttp", () => {
  test("500 JSON con error → muestra ese string, no red", () => {
    const msg = messageFromCheckoutHttp(500, {
      error: "No pudimos guardar el alta. Revisá la base / reintentá.",
      code: "db_unavailable",
    })
    expect(msg).toBe(
      "No pudimos guardar el alta. Revisá la base / reintentá."
    )
    expect(msg).not.toContain("red")
  })

  test("500 body vacío/null → status genérico, no red", () => {
    const msg = messageFromCheckoutHttp(500, null)
    expect(msg).toBe("No se pudo iniciar el checkout (500).")
    expect(msg).not.toMatch(/red/i)
  })

  test("500 body sin error → status genérico", () => {
    expect(messageFromCheckoutHttp(503, {})).toBe(
      "No se pudo iniciar el checkout (503)."
    )
  })
})

describe("NETWORK_ERROR_MESSAGE", () => {
  test("copy de red solo para fallo de fetch real", () => {
    expect(NETWORK_ERROR_MESSAGE).toBe("Error de red. Reintentá.")
  })
})

describe("jsonFromCheckoutThrow", () => {
  test("ECONNREFUSED en message → 503 db_unavailable JSON", () => {
    const r = jsonFromCheckoutThrow(
      new Error("connect ECONNREFUSED 127.0.0.1:5432")
    )
    expect(r.status).toBe(503)
    expect(r.body.code).toBe("db_unavailable")
    expect(r.body.error).toMatch(/base|guardar/i)
  })

  test("ECONNREFUSED en err.code → 503 db_unavailable", () => {
    const err = Object.assign(new Error("connect failed"), {
      code: "ECONNREFUSED",
    })
    const r = jsonFromCheckoutThrow(err)
    expect(r.status).toBe(503)
    expect(r.body.code).toBe("db_unavailable")
  })

  test("error genérico → 500 internal_error JSON", () => {
    const r = jsonFromCheckoutThrow(new Error("boom"))
    expect(r.status).toBe(500)
    expect(r.body.code).toBe("internal_error")
    expect(r.body.error).toBeTruthy()
  })
})

