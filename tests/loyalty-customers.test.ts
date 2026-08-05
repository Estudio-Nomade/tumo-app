import { describe, expect, mock, test } from "bun:test"
import {
  getCustomer,
  listCustomers,
  registerCustomer,
  type CustomerDeps,
} from "@/modules/loyalty/api/customers"

const business = {
  id: "biz-1",
  name: "Carri",
  slug: "carri",
  logo: null,
  primary_color: "#F97316",
  secondary_color: "#FACC15",
  active_modules: ["loyalty"],
  purchases_needed: 10,
  reward_name: "hamburguesa gratis",
}

const customerRow = {
  id: "cust-1",
  name: "Juan",
  phone: "+5491111111111",
  code: "1234",
  purchases: 3,
  total_purchases: 5,
  business_id: "biz-1",
}

function makeDeps(overrides: Partial<CustomerDeps> = {}): CustomerDeps {
  const sql = mock(() => Promise.resolve([]))
  return {
    sql: sql as unknown as CustomerDeps["sql"],
    generateCode: mock(() => "5678"),
    getBusiness: mock(() => Promise.resolve(business)),
    ...overrides,
  }
}

describe("registerCustomer", () => {
  test("caso feliz: crea cliente con código", async () => {
    const sql = mock((strings: TemplateStringsArray) => {
      const q = strings.join(" ")
      if (q.includes("FROM customers") && q.includes("phone")) {
        return Promise.resolve([])
      }
      if (q.includes("INSERT")) {
        return Promise.resolve([
          {
            id: "cust-new",
            name: "Juan",
            phone: "+5491111111111",
            code: "5678",
            purchases: 0,
            total_purchases: 0,
            business_id: "biz-1",
          },
        ])
      }
      return Promise.resolve([])
    })
    const deps = makeDeps({ sql: sql as unknown as CustomerDeps["sql"] })

    const result = await registerCustomer(deps, {
      name: "Juan",
      phone: "+5491111111111",
      slug: "carri",
    })

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      id: "cust-new",
      name: "Juan",
      phone: "+5491111111111",
      code: "5678",
      purchases: 0,
      purchasesNeeded: 10,
      rewardName: "hamburguesa gratis",
    })
    expect(deps.generateCode).toHaveBeenCalled()
  })

  test("phone duplicado: devuelve cliente existente (idempotente)", async () => {
    const sql = mock(() => Promise.resolve([customerRow]))
    const deps = makeDeps({ sql: sql as unknown as CustomerDeps["sql"] })

    const result = await registerCustomer(deps, {
      name: "Juan",
      phone: "+5491111111111",
      slug: "carri",
    })

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      id: "cust-1",
      code: "1234",
      purchases: 3,
      purchasesNeeded: 10,
    })
    expect(deps.generateCode).not.toHaveBeenCalled()
  })

  test("negocio no encontrado", async () => {
    const deps = makeDeps({
      getBusiness: mock(() => Promise.resolve(null)),
    })
    const result = await registerCustomer(deps, {
      name: "Juan",
      phone: "+5491111111111",
      slug: "nope",
    })
    expect(result.status).toBe(404)
  })

  test("name o phone faltante", async () => {
    const deps = makeDeps()
    const r1 = await registerCustomer(deps, {
      name: "",
      phone: "+54911",
      slug: "carri",
    })
    const r2 = await registerCustomer(deps, {
      name: "Juan",
      phone: "",
      slug: "carri",
    })
    expect(r1.status).toBe(400)
    expect(r2.status).toBe(400)
  })
})

describe("getCustomer", () => {
  test("por código", async () => {
    const sql = mock(() => Promise.resolve([customerRow]))
    const deps = makeDeps({ sql: sql as unknown as CustomerDeps["sql"] })

    const result = await getCustomer(deps, { code: "1234", slug: "carri" })

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      id: "cust-1",
      code: "1234",
      purchasesNeeded: 10,
      rewardName: "hamburguesa gratis",
    })
  })

  test("por phone", async () => {
    const sql = mock(() => Promise.resolve([customerRow]))
    const deps = makeDeps({ sql: sql as unknown as CustomerDeps["sql"] })

    const result = await getCustomer(deps, {
      phone: "+5491111111111",
      slug: "carri",
    })

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ phone: "+5491111111111" })
  })

  test("no encontrado", async () => {
    const sql = mock(() => Promise.resolve([]))
    const deps = makeDeps({ sql: sql as unknown as CustomerDeps["sql"] })

    const result = await getCustomer(deps, { code: "0000", slug: "carri" })
    expect(result.status).toBe(404)
  })
})

describe("listCustomers", () => {
  test("lista clientes del negocio con canRedeem", async () => {
    const sql = mock(() =>
      Promise.resolve([
        { ...customerRow, purchases: 10 },
        {
          id: "cust-2",
          name: "Ana",
          phone: "+549222",
          code: "9999",
          purchases: 2,
          total_purchases: 2,
          business_id: "biz-1",
        },
      ])
    )
    const deps = makeDeps({ sql: sql as unknown as CustomerDeps["sql"] })

    const result = await listCustomers(deps, {
      businessId: "biz-1",
      purchasesNeeded: 10,
      rewardName: "hamburguesa gratis",
    })

    expect(result.status).toBe(200)
    expect(Array.isArray(result.body.customers)).toBe(true)
    const customers = result.body.customers as {
      id: string
      canRedeem: boolean
      purchasesNeeded: number
    }[]
    expect(customers).toHaveLength(2)
    expect(customers[0]).toMatchObject({
      id: "cust-1",
      canRedeem: true,
      purchasesNeeded: 10,
      rewardName: "hamburguesa gratis",
    })
    expect(customers[1].canRedeem).toBe(false)
  })

  test("filtra por query nombre o phone o code", async () => {
    const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
      const q = strings.join("?")
      expect(q.toLowerCase()).toContain("ilike")
      expect(values.some((v) => String(v).includes("ana"))).toBe(true)
      return Promise.resolve([
        {
          id: "cust-2",
          name: "Ana",
          phone: "+549222",
          code: "9999",
          purchases: 2,
          total_purchases: 2,
          business_id: "biz-1",
        },
      ])
    })
    const deps = makeDeps({ sql: sql as unknown as CustomerDeps["sql"] })

    const result = await listCustomers(deps, {
      businessId: "biz-1",
      purchasesNeeded: 10,
      rewardName: "premio",
      query: "ana",
    })

    expect(result.status).toBe(200)
    expect((result.body.customers as unknown[]).length).toBe(1)
  })

  test("businessId vacío → 400", async () => {
    const deps = makeDeps()
    const result = await listCustomers(deps, {
      businessId: "",
      purchasesNeeded: 10,
      rewardName: "x",
    })
    expect(result.status).toBe(400)
  })
})
