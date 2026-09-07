import { describe, expect, test } from "bun:test"
import { readFileSync } from "fs"
import { join } from "path"

const root = join(import.meta.dir, "..", "..")

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8")
}

describe("SubscriptionExpiredNotice (source contracts)", () => {
  const src = read("shell/billing/subscription-expired-notice.tsx")

  test("explica suscripción vencida y pago", () => {
    expect(src).toContain("Suscripción vencida")
    expect(src).toContain("se venció")
    expect(src.toLowerCase()).toContain("pago")
  })

  test("tiene variante public y owner", () => {
    expect(src).toContain('audience?: "public" | "owner"')
    expect(src).toContain("Servicio no disponible por el momento")
  })

  test("no usa notFound", () => {
    expect(src).not.toContain("notFound")
  })
})

describe("ModuleAccessGate", () => {
  const src = read("shell/billing/module-access-gate.tsx")

  test("mora → SubscriptionExpiredNotice; no contratado → notFound", () => {
    expect(src).toContain("evaluateModuleAccess")
    expect(src).toContain("billing_overdue")
    expect(src).toContain("SubscriptionExpiredNotice")
    expect(src).toContain("notFound()")
  })
})

describe("module pages show mora notice (not bare 404)", () => {
  const samples: { rel: string; via: "gate" | "evaluate" }[] = [
    { rel: "app/(public)/[slug]/orders/page.tsx", via: "gate" },
    { rel: "app/(public)/[slug]/turnos/page.tsx", via: "evaluate" },
    { rel: "app/(dashboard)/[slug]/dashboard/orders/page.tsx", via: "gate" },
    { rel: "app/(dashboard)/[slug]/dashboard/turnos/page.tsx", via: "gate" },
    { rel: "app/(dashboard)/[slug]/dashboard/loyalty/page.tsx", via: "gate" },
  ]

  for (const { rel, via } of samples) {
    test(`${rel} distingue mora`, () => {
      const src = read(rel)
      if (via === "gate") {
        expect(src).toContain("ModuleAccessGate")
      } else {
        expect(src).toContain("evaluateModuleAccess")
        expect(src).toContain("billing_overdue")
        expect(src).toContain("SubscriptionExpiredNotice")
      }
      expect(src).not.toMatch(/hasModuleAccess\(/)
    })
  }
})
