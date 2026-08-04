import { describe, expect, mock, test } from "bun:test"
import {
  addPurchase,
  type PurchaseDeps,
} from "@/modules/loyalty/api/purchases"

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

describe("addPurchase", () => {
  test("incrementa purchases y total_purchases y calcula canRedeem", async () => {
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
            purchases: 8,
            total_purchases: 20,
            business_id: "biz-1",
          },
        ])
      }
      if (call === 2) {
        return Promise.resolve([
          {
            id: "cust-1",
            name: "Juan",
            phone: "+54911",
            code: "1234",
            purchases: 9,
            total_purchases: 21,
            business_id: "biz-1",
          },
        ])
      }
      return Promise.resolve([])
    })

    const deps: PurchaseDeps = {
      sql: sql as unknown as PurchaseDeps["sql"],
      getBusinessById: mock(() => Promise.resolve(business)),
    }

    const result = await addPurchase(deps, {
      customerId: "cust-1",
      employeeId: "emp-1",
      businessId: "biz-1",
    })

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      purchases: 9,
      total_purchases: 21,
      purchasesNeeded: 10,
      rewardName: "hamburguesa gratis",
      canRedeem: false,
    })
  })

  test("canRedeem true cuando alcanza purchasesNeeded", async () => {
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
            purchases: 9,
            total_purchases: 9,
            business_id: "biz-1",
          },
        ])
      }
      if (call === 2) {
        return Promise.resolve([
          {
            id: "cust-1",
            name: "Juan",
            phone: "+54911",
            code: "1234",
            purchases: 10,
            total_purchases: 10,
            business_id: "biz-1",
          },
        ])
      }
      return Promise.resolve([])
    })

    const deps: PurchaseDeps = {
      sql: sql as unknown as PurchaseDeps["sql"],
      getBusinessById: mock(() => Promise.resolve(business)),
    }

    const result = await addPurchase(deps, {
      customerId: "cust-1",
      employeeId: "emp-1",
      businessId: "biz-1",
    })

    expect(result.status).toBe(200)
    expect(result.body.canRedeem).toBe(true)
    expect(result.body.purchases).toBe(10)
  })

  test("cliente no encontrado", async () => {
    const sql = mock(() => Promise.resolve([]))
    const deps: PurchaseDeps = {
      sql: sql as unknown as PurchaseDeps["sql"],
      getBusinessById: mock(() => Promise.resolve(business)),
    }

    const result = await addPurchase(deps, {
      customerId: "missing",
      employeeId: "emp-1",
      businessId: "biz-1",
    })

    expect(result.status).toBe(404)
  })
})
