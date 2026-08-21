import type { JsonResult, SqlTagged } from "@/modules/orders/lib/types"

export type ProductsDeps = {
  sql: SqlTagged
}

type ProductRow = {
  id: string
  name: string
  category_id: string | null
  category_name: string | null
  price_cents: number
  is_available: boolean
  sort_order: number
}

export async function listProducts(
  deps: ProductsDeps,
  input: { businessId: string }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }

  const rows = (await deps.sql`
    SELECT p.id, p.name, p.category_id, c.name AS category_name,
           p.price_cents, p.is_available, p.sort_order
    FROM products p
    LEFT JOIN product_categories c ON c.id = p.category_id
    WHERE p.business_id = ${businessId}
    ORDER BY c.sort_order ASC, p.sort_order ASC, p.name ASC
  `) as ProductRow[]

  return {
    status: 200,
    body: {
      products: rows.map((r) => ({
        id: r.id,
        name: r.name,
        categoryId: r.category_id,
        categoryName: r.category_name,
        priceCents: Number(r.price_cents),
        isAvailable: Boolean(r.is_available),
        sortOrder: Number(r.sort_order),
      })),
    },
  }
}

export async function setAvailability(
  deps: ProductsDeps,
  input: { productId: string; isAvailable: boolean }
): Promise<JsonResult> {
  const productId = input.productId?.trim() ?? ""
  if (!productId) {
    return { status: 400, body: { error: "Id de producto requerido." } }
  }

  const rows = (await deps.sql`
    UPDATE products SET is_available = ${input.isAvailable}
    WHERE id = ${productId}
    RETURNING id, is_available
  `) as { id: string; is_available: boolean }[]

  if (!rows[0]) {
    return { status: 404, body: { error: "No encontramos ese producto." } }
  }

  return {
    status: 200,
    body: { id: rows[0].id, isAvailable: Boolean(rows[0].is_available) },
  }
}
