import { normalizePhone } from "@/lib/phone"
import type { Business } from "@/lib/modules"
import type {
  CustomerRow,
  JsonResult,
  SqlTagged,
} from "@/modules/loyalty/lib/types"

export type CustomerDeps = {
  sql: SqlTagged
  generateCode: () => string
  getBusiness: (slug: string) => Promise<Business | null>
}

function toCustomerBody(customer: CustomerRow, business: Business) {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    code: customer.code,
    purchases: customer.purchases,
    total_purchases: customer.total_purchases,
    purchasesNeeded: business.purchases_needed,
    rewardName: business.reward_name,
    canRedeem: customer.purchases >= business.purchases_needed,
  }
}

export async function registerCustomer(
  deps: CustomerDeps,
  input: { name: string; phone: string; birthday?: string; slug: string }
): Promise<JsonResult> {
  const name = input.name?.trim() ?? ""
  const phone = normalizePhone(input.phone ?? "")
  const slug = input.slug?.trim() ?? ""

  if (!name || !phone || !slug) {
    return {
      status: 400,
      body: { error: "Nombre y WhatsApp son requeridos." },
    }
  }

  const business = await deps.getBusiness(slug)
  if (!business) {
    return { status: 404, body: { error: "Negocio no encontrado" } }
  }

  const existing = (await deps.sql`
    SELECT id, name, phone, code, purchases, total_purchases, business_id
    FROM customers
    WHERE business_id = ${business.id}
      AND regexp_replace(phone, '[^0-9]', '', 'g') = ${phone}
    LIMIT 1
  `) as CustomerRow[]

  if (existing[0]) {
    return {
      status: 200,
      body: { ...toCustomerBody(existing[0], business), existing: true },
    }
  }

  let code = ""
  let created: CustomerRow | undefined
  for (let i = 0; i < 10; i++) {
    code = deps.generateCode()
    const collision = (await deps.sql`
      SELECT id FROM customers
      WHERE code = ${code} AND business_id = ${business.id}
      LIMIT 1
    `) as { id: string }[]
    if (collision[0]) continue

    const birthday = input.birthday?.trim() || null
    const rows = (await deps.sql`
      INSERT INTO customers (name, phone, birthday, code, business_id)
      VALUES (${name}, ${phone}, ${birthday}, ${code}, ${business.id})
      RETURNING id, name, phone, code, purchases, total_purchases, business_id
    `) as CustomerRow[]
    created = rows[0]
    break
  }

  if (!created) {
    return {
      status: 500,
      body: { error: "No pudimos generar un código único." },
    }
  }

  return {
    status: 200,
    body: { ...toCustomerBody(created, business), existing: false },
  }
}

export async function getCustomer(
  deps: CustomerDeps,
  input: { code?: string; phone?: string; id?: string; slug: string }
): Promise<JsonResult> {
  const slug = input.slug?.trim() ?? ""
  const code = input.code?.trim()
  const phone = input.phone ? normalizePhone(input.phone) : ""
  const id = input.id?.trim()

  if (!slug || (!code && !phone && !id)) {
    return {
      status: 400,
      body: { error: "Indicá código, WhatsApp o id." },
    }
  }

  const business = await deps.getBusiness(slug)
  if (!business) {
    return { status: 404, body: { error: "Negocio no encontrado" } }
  }

  let rows: CustomerRow[] = []
  if (id) {
    rows = (await deps.sql`
      SELECT id, name, phone, code, purchases, total_purchases, business_id
      FROM customers
      WHERE id = ${id} AND business_id = ${business.id}
      LIMIT 1
    `) as CustomerRow[]
  } else if (code) {
    rows = (await deps.sql`
      SELECT id, name, phone, code, purchases, total_purchases, business_id
      FROM customers
      WHERE code = ${code} AND business_id = ${business.id}
      LIMIT 1
    `) as CustomerRow[]
  } else if (phone) {
    rows = (await deps.sql`
      SELECT id, name, phone, code, purchases, total_purchases, business_id
      FROM customers
      WHERE business_id = ${business.id}
        AND regexp_replace(phone, '[^0-9]', '', 'g') = ${phone}
      LIMIT 1
    `) as CustomerRow[]
  }

  if (!rows[0]) {
    return { status: 404, body: { error: "Cliente no encontrado" } }
  }

  return { status: 200, body: toCustomerBody(rows[0], business) }
}

export async function listCustomers(
  deps: Pick<CustomerDeps, "sql">,
  input: {
    businessId: string
    purchasesNeeded: number
    rewardName: string
    query?: string
    limit?: number
  }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }

  const limit =
    Number.isFinite(input.limit) && (input.limit as number) > 0
      ? Math.min(Math.floor(input.limit as number), 200)
      : 100
  const q = input.query?.trim() ?? ""

  let rows: CustomerRow[]
  if (q) {
    const pattern = `%${q}%`
    rows = (await deps.sql`
      SELECT id, name, phone, code, purchases, total_purchases, business_id
      FROM customers
      WHERE business_id = ${businessId}
        AND (
          name ILIKE ${pattern}
          OR phone ILIKE ${pattern}
          OR code ILIKE ${pattern}
        )
      ORDER BY purchases DESC, name ASC
      LIMIT ${limit}
    `) as CustomerRow[]
  } else {
    rows = (await deps.sql`
      SELECT id, name, phone, code, purchases, total_purchases, business_id
      FROM customers
      WHERE business_id = ${businessId}
      ORDER BY purchases DESC, name ASC
      LIMIT ${limit}
    `) as CustomerRow[]
  }

  const businessLike = {
    purchases_needed: input.purchasesNeeded,
    reward_name: input.rewardName,
  } as Business

  return {
    status: 200,
    body: {
      customers: rows.map((row) => toCustomerBody(row, businessLike)),
    },
  }
}
