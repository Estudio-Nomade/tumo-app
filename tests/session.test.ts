import { describe, expect, mock, test } from "bun:test"
import {
  createSession,
  deleteSession,
  validateSession,
  type SessionEmployee,
} from "@/shell/auth/session"

describe("createSession", () => {
  test("inserta en DB y devuelve token UUID", async () => {
    const sqlMock = mock(() => Promise.resolve([]))

    const token = await createSession("emp-1", sqlMock)

    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
    expect(sqlMock).toHaveBeenCalledTimes(1)
    const call = sqlMock.mock.calls[0] as unknown[]
    const values = call.slice(1)
    expect(values).toContain("emp-1")
    expect(values).toContain(token)
  })
})

describe("validateSession", () => {
  test("con token válido devuelve empleado", async () => {
    const row: SessionEmployee = {
      id: "emp-1",
      name: "Ana",
      phone: "+5491112345678",
      role: "owner",
      businessId: "biz-1",
    }
    const sqlMock = mock(() => Promise.resolve([row]))

    const result = await validateSession("token-ok", sqlMock)

    expect(result).toEqual(row)
  })

  test("con token inexistente devuelve null", async () => {
    const sqlMock = mock(() => Promise.resolve([]))
    expect(await validateSession("token-missing", sqlMock)).toBeNull()
  })

  test("con token expirado devuelve null", async () => {
    const sqlMock = mock(() => Promise.resolve([]))
    expect(await validateSession("token-expired", sqlMock)).toBeNull()
  })
})

describe("deleteSession", () => {
  test("borra fila por token", async () => {
    const sqlMock = mock(() => Promise.resolve([]))

    await deleteSession("token-to-delete", sqlMock)

    expect(sqlMock).toHaveBeenCalledTimes(1)
    const call = sqlMock.mock.calls[0] as unknown[]
    expect(call.slice(1)).toContain("token-to-delete")
  })
})
