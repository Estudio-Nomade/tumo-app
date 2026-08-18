import type { Business } from "@/lib/modules"
import type {
  CustomerRow,
  JsonResult,
  PointRange,
  SqlTagged,
} from "@/modules/loyalty/lib/types"
import { rangeLabel, withTransaction } from "@/modules/loyalty/lib/types"

export type PointsDeps = {
  sql: SqlTagged
  getBusinessById: (id: string) => Promise<Business | null>
}

const DUPE_WINDOW_MS = 60_000

export async function addPoints(
  deps: PointsDeps,
  input: {
    customerId: string
    employeeId: string
    businessId: string
    rangeIndex: number
    force?: boolean
    expectedPoints?: number
  }
): Promise<JsonResult> {
  const {
    customerId,
    employeeId,
    businessId,
    rangeIndex,
    force = false,
    expectedPoints,
  } = input

  if (!Number.isInteger(rangeIndex) || rangeIndex < 0) {
    return { status: 400, body: { error: "Tramo inválido." } }
  }

  const business = await deps.getBusinessById(businessId)
  if (!business) {
    return { status: 404, body: { error: "Negocio no encontrado" } }
  }

  const ranges = (business.point_ranges ?? []) as PointRange[]
  const band = ranges[rangeIndex]
  const bandPoints = Number(band?.points)
  if (
    !band ||
    !Number.isInteger(bandPoints) ||
    bandPoints <= 0 ||
    bandPoints > 1_000_000
  ) {
    return { status: 400, body: { error: "Tramo inválido." } }
  }

  if (
    expectedPoints !== undefined &&
    expectedPoints !== null &&
    expectedPoints !== bandPoints
  ) {
    return {
      status: 409,
      body: { error: "Los rangos cambiaron. Volvé a elegir.", code: "RANGE_CHANGED" },
    }
  }

  const label = rangeLabel({ ...band, points: bandPoints })
  const amountCents = Number.isInteger(band.min_cents) ? band.min_cents : 0

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

    if (!force) {
      const recent = (await tx`
        SELECT created_at FROM point_movements
        WHERE customer_id = ${customerId}
          AND business_id = ${businessId}
          AND kind = 'earn'
        ORDER BY created_at DESC
        LIMIT 1
      `) as { created_at: Date | string }[]

      if (recent[0]) {
        const ts =
          recent[0].created_at instanceof Date
            ? recent[0].created_at.getTime()
            : new Date(recent[0].created_at).getTime()
        // Fail closed: unparseable timestamps still require force
        if (!Number.isFinite(ts) || Date.now() - ts < DUPE_WINDOW_MS) {
          return {
            status: 409,
            body: {
              error: "Ya sumaste puntos hace poco. ¿Confirmás de nuevo?",
              code: "DUPLICATE_RECENT",
            },
          }
        }
      }
    }

    const updated = (await tx`
      UPDATE customers
      SET points = points + ${bandPoints},
          total_points = total_points + ${bandPoints}
      WHERE id = ${customerId}
      RETURNING id, name, phone, code, points, total_points, business_id
    `) as CustomerRow[]

    await tx`
      INSERT INTO point_movements (
        customer_id, employee_id, business_id,
        points, amount_cents, range_label, kind
      )
      VALUES (
        ${customerId}, ${employeeId}, ${businessId},
        ${bandPoints}, ${amountCents}, ${label}, 'earn'
      )
    `

    const customer = updated[0]
    return {
      status: 200,
      body: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        code: customer.code,
        points: customer.points,
        total_points: customer.total_points,
        pointsNeeded: business.points_needed,
        rewardName: business.reward_name,
        canRedeem: customer.points >= business.points_needed,
        added: bandPoints,
        rangeLabel: label,
      },
    }
  })
}
