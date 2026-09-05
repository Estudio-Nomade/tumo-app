import type { JsonResult, SqlTagged } from "@/modules/orders/lib/types"
import { withTransaction } from "@/modules/orders/lib/types"

export type ProductsDeps = {
  sql: SqlTagged
}

type ProductRow = {
  id: string
  name: string
  description: string | null
  photo: string | null
  category_id: string | null
  category_name: string | null
  price_cents: number
  is_available: boolean
  sort_order: number
}

export type VariantOptionInput = { name: string; priceDeltaCents: number }
export type VariantGroupInput = {
  name: string
  selectionType: "single" | "multiple"
  isRequired: boolean
  options: VariantOptionInput[]
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
    SELECT p.id, p.name, p.description, p.photo, p.category_id, c.name AS category_name,
           p.price_cents, p.is_available, p.sort_order
    FROM products p
    LEFT JOIN product_categories c ON c.id = p.category_id
    WHERE p.business_id = ${businessId}
    ORDER BY c.sort_order ASC, p.sort_order ASC, p.name ASC
  `) as ProductRow[]

  const ids = rows.map((r) => r.id)
  const groups = ids.length
    ? ((await deps.sql`
        SELECT id, product_id, name, selection_type, is_required, sort_order
        FROM product_variant_groups
        WHERE product_id = ANY(${ids})
        ORDER BY sort_order ASC
      `) as {
        id: string
        product_id: string
        name: string
        selection_type: string
        is_required: boolean
        sort_order: number
      }[])
    : []
  const groupIds = groups.map((g) => g.id)
  const options = groupIds.length
    ? ((await deps.sql`
        SELECT id, group_id, name, price_delta_cents, sort_order
        FROM product_variant_options
        WHERE group_id = ANY(${groupIds})
        ORDER BY sort_order ASC
      `) as {
        id: string
        group_id: string
        name: string
        price_delta_cents: number
        sort_order: number
      }[])
    : []

  const photoRows = ids.length
    ? ((await deps.sql`
        SELECT id, product_id, url, sort_order
        FROM product_photos
        WHERE product_id = ANY(${ids})
        ORDER BY sort_order ASC, created_at ASC
      `) as {
        id: string
        product_id: string
        url: string
        sort_order: number
      }[])
    : []

  const optionsByGroup = new Map<string, typeof options>()
  for (const o of options) {
    const list = optionsByGroup.get(o.group_id) ?? []
    list.push(o)
    optionsByGroup.set(o.group_id, list)
  }
  const groupsByProduct = new Map<string, typeof groups>()
  for (const g of groups) {
    const list = groupsByProduct.get(g.product_id) ?? []
    list.push(g)
    groupsByProduct.set(g.product_id, list)
  }
  const photosByProduct = new Map<
    string,
    { id: string; url: string; sortOrder: number }[]
  >()
  for (const ph of photoRows) {
    const list = photosByProduct.get(ph.product_id) ?? []
    list.push({
      id: ph.id,
      url: ph.url,
      sortOrder: Number(ph.sort_order),
    })
    photosByProduct.set(ph.product_id, list)
  }

  return {
    status: 200,
    body: {
      products: rows.map((r) => {
        const photos = photosByProduct.get(r.id) ?? []
        return {
          id: r.id,
          name: r.name,
          description: r.description,
          photo: photos[0]?.url ?? r.photo ?? null,
          photos,
          categoryId: r.category_id,
          categoryName: r.category_name,
          priceCents: Number(r.price_cents),
          isAvailable: Boolean(r.is_available),
          sortOrder: Number(r.sort_order),
          variantGroups: (groupsByProduct.get(r.id) ?? []).map((g) => ({
            id: g.id,
            name: g.name,
            selectionType: g.selection_type,
            isRequired: Boolean(g.is_required),
            options: (optionsByGroup.get(g.id) ?? []).map((o) => ({
              id: o.id,
              name: o.name,
              priceDeltaCents: Number(o.price_delta_cents),
            })),
          })),
        }
      }),
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

function parsePriceCents(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null
  return value
}

async function nameTaken(
  sql: SqlTagged,
  businessId: string,
  name: string,
  exceptId?: string
): Promise<boolean> {
  const rows = exceptId
    ? ((await sql`
        SELECT id FROM products
        WHERE business_id = ${businessId}
          AND lower(name) = ${name.toLowerCase()}
          AND id <> ${exceptId}
        LIMIT 1
      `) as { id: string }[])
    : ((await sql`
        SELECT id FROM products
        WHERE business_id = ${businessId}
          AND lower(name) = ${name.toLowerCase()}
        LIMIT 1
      `) as { id: string }[])
  return Boolean(rows[0])
}

export async function listCategories(
  deps: ProductsDeps,
  input: { businessId: string }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }
  const rows = (await deps.sql`
    SELECT id, name
    FROM product_categories
    WHERE business_id = ${businessId}
    ORDER BY sort_order ASC, name ASC
  `) as { id: string; name: string }[]
  return {
    status: 200,
    body: { categories: rows.map((r) => ({ id: r.id, name: r.name })) },
  }
}

export async function createCategory(
  deps: ProductsDeps,
  input: { businessId: string; name: string }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  const name = input.name?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }
  if (!name) {
    return { status: 400, body: { error: "Escribí el nombre de la categoría." } }
  }

  const existing = (await deps.sql`
    SELECT id
    FROM product_categories
    WHERE business_id = ${businessId} AND lower(name) = lower(${name})
    LIMIT 1
  `) as { id: string }[]
  if (existing[0]) {
    return { status: 409, body: { error: "Ya hay una categoría con ese nombre." } }
  }

  const maxRows = (await deps.sql`
    SELECT MAX(sort_order) AS max
    FROM product_categories
    WHERE business_id = ${businessId}
  `) as { max: number | null }[]
  const nextSort = Number(maxRows[0]?.max ?? -1) + 1

  const inserted = (await deps.sql`
    INSERT INTO product_categories (business_id, name, sort_order)
    VALUES (${businessId}, ${name}, ${nextSort})
    RETURNING id, name, sort_order
  `) as { id: string; name: string; sort_order: number }[]

  const row = inserted[0]
  return {
    status: 200,
    body: {
      id: row.id,
      name: row.name,
      sortOrder: Number(row.sort_order),
    },
  }
}

export async function createProduct(
  deps: ProductsDeps,
  input: {
    businessId: string
    name: string
    priceCents: number
    description?: string
    categoryId?: string | null
    photo?: string | null
  }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  const name = input.name?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }
  if (!name) {
    return { status: 400, body: { error: "Escribí el nombre del producto." } }
  }
  const priceCents = parsePriceCents(input.priceCents)
  if (priceCents == null) {
    return { status: 400, body: { error: "El precio tiene que ser un número entero (centavos)." } }
  }
  if (await nameTaken(deps.sql, businessId, name)) {
    return { status: 409, body: { error: "Ya hay un producto con ese nombre." } }
  }

  const inserted = (await deps.sql`
    INSERT INTO products (business_id, name, description, price_cents, category_id, photo)
    VALUES (
      ${businessId}, ${name}, ${input.description?.trim() || null},
      ${priceCents}, ${input.categoryId || null}, ${input.photo?.trim() || null}
    )
    RETURNING id
  `) as { id: string }[]

  return { status: 200, body: { id: inserted[0].id } }
}

export async function updateProduct(
  deps: ProductsDeps,
  input: {
    productId: string
    businessId: string
    name: string
    priceCents: number
    description?: string
    categoryId?: string | null
    /** Si se omite, no toca products.photo (cover lo maneja product_photos). */
    photo?: string | null
  }
): Promise<JsonResult> {
  const productId = input.productId?.trim() ?? ""
  const businessId = input.businessId?.trim() ?? ""
  const name = input.name?.trim() ?? ""
  if (!productId || !businessId) {
    return { status: 400, body: { error: "Datos incompletos." } }
  }
  if (!name) {
    return { status: 400, body: { error: "Escribí el nombre del producto." } }
  }
  const priceCents = parsePriceCents(input.priceCents)
  if (priceCents == null) {
    return { status: 400, body: { error: "El precio tiene que ser un número entero (centavos)." } }
  }
  if (await nameTaken(deps.sql, businessId, name, productId)) {
    return { status: 409, body: { error: "Ya hay un producto con ese nombre." } }
  }

  const touchPhoto = Object.prototype.hasOwnProperty.call(input, "photo")
  const rows = touchPhoto
    ? ((await deps.sql`
        UPDATE products
        SET name = ${name},
            description = ${input.description?.trim() || null},
            price_cents = ${priceCents},
            category_id = ${input.categoryId || null},
            photo = ${input.photo?.trim() || null}
        WHERE id = ${productId} AND business_id = ${businessId}
        RETURNING id
      `) as { id: string }[])
    : ((await deps.sql`
        UPDATE products
        SET name = ${name},
            description = ${input.description?.trim() || null},
            price_cents = ${priceCents},
            category_id = ${input.categoryId || null}
        WHERE id = ${productId} AND business_id = ${businessId}
        RETURNING id
      `) as { id: string }[])

  if (!rows[0]) {
    return { status: 404, body: { error: "No encontramos ese producto." } }
  }
  return { status: 200, body: { id: rows[0].id } }
}

export async function deleteProduct(
  deps: ProductsDeps,
  input: { productId: string; businessId: string }
): Promise<JsonResult> {
  const productId = input.productId?.trim() ?? ""
  const businessId = input.businessId?.trim() ?? ""
  if (!productId || !businessId) {
    return { status: 400, body: { error: "Datos incompletos." } }
  }

  const rows = (await deps.sql`
    DELETE FROM products
    WHERE id = ${productId} AND business_id = ${businessId}
    RETURNING id
  `) as { id: string }[]

  if (!rows[0]) {
    return { status: 404, body: { error: "No encontramos ese producto." } }
  }
  return { status: 200, body: { id: rows[0].id } }
}

export async function saveVariants(
  deps: ProductsDeps,
  input: { productId: string; businessId: string; groups: VariantGroupInput[] }
): Promise<JsonResult> {
  const productId = input.productId?.trim() ?? ""
  const businessId = input.businessId?.trim() ?? ""
  if (!productId || !businessId) {
    return { status: 400, body: { error: "Datos incompletos." } }
  }

  const groups = Array.isArray(input.groups) ? input.groups : []
  for (const g of groups) {
    if (!g.name?.trim()) {
      return { status: 400, body: { error: "Cada grupo de variantes necesita un nombre." } }
    }
    if (g.selectionType !== "single" && g.selectionType !== "multiple") {
      return { status: 400, body: { error: "Elegí si se puede marcar una o varias opciones." } }
    }
    for (const o of g.options ?? []) {
      if (!o.name?.trim()) {
        return { status: 400, body: { error: "Cada opción necesita un nombre." } }
      }
      if (!Number.isInteger(o.priceDeltaCents)) {
        return { status: 400, body: { error: "El extra de precio tiene que ser un número entero." } }
      }
    }
  }

  const owned = (await deps.sql`
    SELECT id FROM products
    WHERE id = ${productId} AND business_id = ${businessId}
    LIMIT 1
  `) as { id: string }[]
  if (!owned[0]) {
    return { status: 404, body: { error: "No encontramos ese producto." } }
  }

  await withTransaction(deps.sql, async (tx) => {
    await tx`DELETE FROM product_variant_groups WHERE product_id = ${productId}`
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i]
      const inserted = (await tx`
        INSERT INTO product_variant_groups (product_id, name, selection_type, is_required, sort_order)
        VALUES (
          ${productId}, ${g.name.trim()}, ${g.selectionType}, ${Boolean(g.isRequired)}, ${i}
        )
        RETURNING id
      `) as { id: string }[]
      const groupId = inserted[0].id
      const options = g.options ?? []
      for (let j = 0; j < options.length; j++) {
        const o = options[j]
        await tx`
          INSERT INTO product_variant_options (group_id, name, price_delta_cents, sort_order)
          VALUES (${groupId}, ${o.name.trim()}, ${o.priceDeltaCents}, ${j})
        `
      }
    }
  })

  return { status: 200, body: { ok: true } }
}
