import { describe, expect, mock, test } from "bun:test"
import { getEmployeeByPhone, type Employee } from "@/shell/db/employee"

describe("getEmployeeByPhone", () => {
  test("encuentra empleado y devuelve datos", async () => {
    const employee: Employee = {
      id: "emp-1",
      name: "Ana",
      phone: "+5491112345678",
      role: "owner",
      business_id: "biz-1",
    }
    const sqlMock = mock(() => Promise.resolve([employee]))

    const result = await getEmployeeByPhone(
      "+5491112345678",
      "biz-1",
      sqlMock
    )

    expect(result).toEqual(employee)
    expect(sqlMock).toHaveBeenCalled()
  })

  test("no encuentra empleado y devuelve null", async () => {
    const sqlMock = mock(() => Promise.resolve([] as Employee[]))

    const result = await getEmployeeByPhone(
      "+5491199999999",
      "biz-1",
      sqlMock
    )

    expect(result).toBeNull()
  })
})
