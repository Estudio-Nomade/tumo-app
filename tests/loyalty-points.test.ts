import { describe, expect, mock, test } from "bun:test"
import { addPoints, type PointsDeps } from "@/modules/loyalty/api/points"

const business = {
  id: "biz-1",
  name: "Carri",
  slug: "carri",
  logo: null,
  primary_color: "#F97316",
  secondary_color: "#FACC15",
  active_modules: ["loyalty"],
  points_needed: 150,
  reward_name: "hamburguesa gratis",
  point_ranges: [
    { min_cents: 0, max_cents: 1000000, points: 0 },
    { min_cents: 1000000, max_cents: 2000000, points: 50 },
    { min_cents: 2000000, max_cents: 3000000, points: 100 },
    { min_cents: 3000000, max_cents: null, points: 150 },
  ],
}

function makeSql(handlers: Array<() => Promise<unknown[]>>) {
  let call = 0
  return mock(() => {
    const h = handlers[call++]
    if (!h) return Promise.resolve([])
    return h()
  })
}

describe("addPoints", () => {
  test("suma puntos del tramo y calcula canRedeem", async () => {
    const sql = makeSql([
      () =>
        Promise.resolve([
          {
            id: "cust-1",
            name: "Juan",
            phone: "+54911",
            code: "1234",
            points: 40,
            total_points: 100,
            business_id: "biz-1",
          },
        ]),
      () => Promise.resolve([]),
      () =>
        Promise.resolve([
          {
            id: "cust-1",
            name: "Juan",
            phone: "+54911",
            code: "1234",
            points: 90,
            total_points: 150,
            business_id: "biz-1",
          },
        ]),
      () => Promise.resolve([]),
    ])

    const deps: PointsDeps = {
      sql: sql as unknown as PointsDeps["sql"],
      getBusinessById: mock(() => Promise.resolve(business)),
    }

    const result = await addPoints(deps, {
      customerId: "cust-1",
      employeeId: "emp-1",
      businessId: "biz-1",
      rangeIndex: 1,
    })

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      points: 90,
      total_points: 150,
      pointsNeeded: 150,
      canRedeem: false,
      added: 50,
    })
  })

  test("400 si rangeIndex es banda de 0 pts", async () => {
    const sql = mock(() => Promise.resolve([]))
    const deps: PointsDeps = {
      sql: sql as unknown as PointsDeps["sql"],
      getBusinessById: mock(() => Promise.resolve(business)),
    }
    const result = await addPoints(deps, {
      customerId: "cust-1",
      employeeId: "emp-1",
      businessId: "biz-1",
      rangeIndex: 0,
    })
    expect(result.status).toBe(400)
    expect(sql).not.toHaveBeenCalled()
  })

  test("409 RANGE_CHANGED si expectedPoints no coincide", async () => {
    const sql = mock(() => Promise.resolve([]))
    const deps: PointsDeps = {
      sql: sql as unknown as PointsDeps["sql"],
      getBusinessById: mock(() => Promise.resolve(business)),
    }
    const result = await addPoints(deps, {
      customerId: "cust-1",
      employeeId: "emp-1",
      businessId: "biz-1",
      rangeIndex: 1,
      expectedPoints: 99,
    })
    expect(result.status).toBe(409)
    expect(result.body.code).toBe("RANGE_CHANGED")
  })

  test("409 DUPLICATE_RECENT si earn reciente sin force", async () => {
    const sql = makeSql([
      () =>
        Promise.resolve([
          {
            id: "cust-1",
            name: "Juan",
            phone: "+54911",
            code: "1234",
            points: 10,
            total_points: 10,
            business_id: "biz-1",
          },
        ]),
      () => Promise.resolve([{ created_at: new Date() }]),
    ])
    const deps: PointsDeps = {
      sql: sql as unknown as PointsDeps["sql"],
      getBusinessById: mock(() => Promise.resolve(business)),
    }
    const result = await addPoints(deps, {
      customerId: "cust-1",
      employeeId: "emp-1",
      businessId: "biz-1",
      rangeIndex: 1,
    })
    expect(result.status).toBe(409)
    expect(result.body.code).toBe("DUPLICATE_RECENT")
  })

  test("force true salta anti-dupe", async () => {
    const sql = makeSql([
      () =>
        Promise.resolve([
          {
            id: "cust-1",
            name: "Juan",
            phone: "+54911",
            code: "1234",
            points: 100,
            total_points: 100,
            business_id: "biz-1",
          },
        ]),
      () =>
        Promise.resolve([
          {
            id: "cust-1",
            name: "Juan",
            phone: "+54911",
            code: "1234",
            points: 150,
            total_points: 150,
            business_id: "biz-1",
          },
        ]),
      () => Promise.resolve([]),
    ])
    const deps: PointsDeps = {
      sql: sql as unknown as PointsDeps["sql"],
      getBusinessById: mock(() => Promise.resolve(business)),
    }
    const result = await addPoints(deps, {
      customerId: "cust-1",
      employeeId: "emp-1",
      businessId: "biz-1",
      rangeIndex: 1,
      force: true,
    })
    expect(result.status).toBe(200)
    expect(result.body.canRedeem).toBe(true)
  })

  test("cliente no encontrado", async () => {
    const sql = makeSql([() => Promise.resolve([])])
    const deps: PointsDeps = {
      sql: sql as unknown as PointsDeps["sql"],
      getBusinessById: mock(() => Promise.resolve(business)),
    }
    const result = await addPoints(deps, {
      customerId: "missing",
      employeeId: "emp-1",
      businessId: "biz-1",
      rangeIndex: 1,
    })
    expect(result.status).toBe(404)
  })
})
