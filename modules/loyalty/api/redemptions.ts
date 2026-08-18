import type { Business } from "@/lib/modules"
import type {
  CustomerRow,
  JsonResult,
  SqlTagged,
} from "@/modules/loyalty/lib/types"
import { withTransaction } from "@/modules/loyalty/lib/types"

export type RedemptionDeps = {
  sql: SqlTagged
  getBusinessById: (id: string) => Promise<Business | null>
}

export async function redeemReward(
  deps: RedemptionDeps,
  input: { customerId: string; employeeId: string; businessId: string }
): Promise<JsonResult> {
  const { customerId, employeeId, businessId } = input

  const business = await deps.getBusinessById(businessId)
  if (!business) {
    return { status: 404, body: { error: "Negocio no encontrado" } }
  }

  const needed = Number(business.points_needed)
  if (!Number.isInteger(needed) || needed < 1) {
    return {
      status: 400,
      body: { error: "El programa no tiene un umbral de canje válido." },
    }
  }

  return withTransaction(deps.sql, async (tx) => {
    const customers = (await tx`
      SELECT id, name, phone, code, points, total_points, business_id
      FROM customers
      WHERE id = ${customerId} AND business_id = ${businessId}
      FOR UPDATE
      LIMIT 1
    `) as CustomerRow[]

    if (!customers[0]) {
      return { status: 404, body: { error: "Cliente no encontrado" } }
    }

    const prev = customers[0].points
    if (prev < needed) {
      return {
        status: 400,
        body: { error: "Todavía no alcanza para canjear el premio." },
      }
    }

    await tx`
      UPDATE customers SET points = 0 WHERE id = ${customerId}
    `

    await tx`
      INSERT INTO point_movements (
        customer_id, employee_id, business_id,
        points, amount_cents, range_label, kind
      )
      VALUES (
        ${customerId}, ${employeeId}, ${businessId},
        ${prev}, NULL, NULL, 'redeem'
      )
    `

    return { status: 200, body: { success: true, points: 0 } }
  })
}
