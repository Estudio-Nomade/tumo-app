import { describe, expect, test } from "bun:test"
import { getClientBrandPreviews } from "@/shell/ui/client-brand-preview-registry"

describe("getClientBrandPreviews", () => {
  test("solo devuelve módulos activos registrados", () => {
    const result = getClientBrandPreviews(["loyalty"])
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("loyalty")
    expect(result[0]?.name).toBe("Fidelización")
  })

  test("vacío si el negocio no tiene módulos con preview", () => {
    expect(getClientBrandPreviews([])).toEqual([])
    expect(getClientBrandPreviews(["orders", "unknown"])).toEqual([])
  })

  test("ignora ids activos sin preview registrado", () => {
    const result = getClientBrandPreviews(["loyalty", "orders"])
    expect(result.map((m) => m.id)).toEqual(["loyalty"])
  })
})
