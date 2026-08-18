import { describe, expect, mock, test } from "bun:test"
import {
  redeemReward,
  type RedemptionDeps,
} from "@/modules/loyalty/api/redemptions"

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
  point_ranges: [],
}

describe("redeemReward", () => {
  test("canjea cuando points >= points_needed y resetea a 0", async () => {
    let call = 0
    const sql = mock(() => {
      call++
      if (call === 1) {
        return Promise.resolve([
          {
            id: "cust-1",
            name: "Juan",
            phone: "+54911",
            code: "1234",
            points: 150,
            total_points: 400,
            business_id: "biz-1",
          },
        ])
      }
      return Promise.resolve([])
    })

    const deps: RedemptionDeps = {
      sql: sql as unknown as RedemptionDeps["sql"],
      getBusinessById: mock(() => Promise.resolve(business)),
    }

    const result = await redeemReward(deps, {
      customerId: "cust-1",
      employeeId: "emp-1",
      businessId: "biz-1",
    })

    expect(result.status).toBe(200)
    expect(result.body).toEqual({ success: true, points: 0 })
    expect(sql).toHaveBeenCalled()
  })

  test("error 400 si no alcanza", async () => {
    const sql = mock(() =>
      Promise.resolve([
        {
          id: "cust-1",
          name: "Juan",
          phone: "+54911",
          code: "1234",
          points: 50,
          total_points: 50,
          business_id: "biz-1",
        },
      ])
    )

    const deps: RedemptionDeps = {
      sql: sql as unknown as RedemptionDeps["sql"],
      getBusinessById: mock(() => Promise.resolve(business)),
    }

    const result = await redeemReward(deps, {
      customerId: "cust-1",
      employeeId: "emp-1",
      businessId: "biz-1",
    })

    expect(result.status).toBe(400)
  })
})
