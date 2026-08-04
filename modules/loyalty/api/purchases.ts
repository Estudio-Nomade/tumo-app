import type { Business } from "@/lib/modules"
import type {
  CustomerRow,
  JsonResult,
  SqlTagged,
} from "@/modules/loyalty/lib/types"

export type PurchaseDeps = {
  sql: SqlTagged
  getBusinessById: (id: string) => Promise<Business | null>
}

export async function addPurchase(
  deps: PurchaseDeps,
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

  const updated = (await deps.sql`
    UPDATE customers
    SET purchases = purchases + 1, total_purchases = total_purchases + 1
    WHERE id = ${customerId}
    RETURNING id, name, phone, code, purchases, total_purchases, business_id
  `) as CustomerRow[]

  await deps.sql`
    INSERT INTO purchases (customer_id, employee_id, business_id)
    VALUES (${customerId}, ${employeeId}, ${businessId})
  `

  const customer = updated[0]
  return {
    status: 200,
    body: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      code: customer.code,
      purchases: customer.purchases,
      total_purchases: customer.total_purchases,
      purchasesNeeded: business.purchases_needed,
      rewardName: business.reward_name,
      canRedeem: customer.purchases >= business.purchases_needed,
    },
  }
}
