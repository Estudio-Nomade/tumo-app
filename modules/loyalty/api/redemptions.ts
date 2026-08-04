import type { Business } from "@/lib/modules"
import type {
  CustomerRow,
  JsonResult,
  SqlTagged,
} from "@/modules/loyalty/lib/types"

export type RedemptionDeps = {
  sql: SqlTagged
  getBusinessById: (id: string) => Promise<Business | null>
}

export async function redeemReward(
  deps: RedemptionDeps,
  input: { customerId: string; employeeId: string; businessId: string }
): Promise<JsonResult> {
  const { customerId, employeeId, businessId } = input

  const customers = (await deps.sql`
    SELECT id, name, phone, code, purchases, total_purchases, business_id
    FROM customers
    WHERE id = ${customerId} AND business_id = ${businessId}
    LIMIT 1
  `) as CustomerRow[]

  if (!customers[0]) {
    return { status: 404, body: { error: "Cliente no encontrado" } }
  }

  const business = await deps.getBusinessById(businessId)
  if (!business) {
    return { status: 404, body: { error: "Negocio no encontrado" } }
  }

  if (customers[0].purchases < business.purchases_needed) {
    return {
      status: 400,
      body: { error: "Todavía no alcanza para canjear el premio." },
    }
  }

  await deps.sql`
    INSERT INTO redemptions (customer_id, employee_id, business_id)
    VALUES (${customerId}, ${employeeId}, ${businessId})
  `

  await deps.sql`
    UPDATE customers SET purchases = 0 WHERE id = ${customerId}
  `

  return { status: 200, body: { success: true, purchases: 0 } }
}
