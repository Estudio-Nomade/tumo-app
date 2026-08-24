import type { Business } from "@/lib/modules"
import type { JsonResult, PaymentMethod, PaymentStatus, SqlTagged } from "@/modules/orders/lib/types"
import {
  isOpenNow,
  nextOpening,
  type OpeningInfo,
  type OrdersHours,
} from "@/modules/orders/lib/hours"

export type CatalogDeps = {
  sql: SqlTagged
  getBusiness: (slug: string) => Promise<Business | null>
}

type CategoryRow = { id: string; name: string; sort_order: number }
type ProductRow = {
  id: string
  category_id: string | null
  name: string
  description: string | null
  price_cents: number
  photo: string | null
  is_available: boolean
  sort_order: number
}
type VariantGroupRow = {
  id: string
  product_id: string
  name: string
  selection_type: string
  is_required: boolean
  sort_order: number
}
type VariantOptionRow = {
  id: string
  group_id: string
  name: string
  price_delta_cents: number
  is_available: boolean
  sort_order: number
}
type SettingsRow = {
  delivery_fee_cents: number
  is_paused: boolean
  hours: OrdersHours | null
}

export type CatalogCategory = { id: string; name: string; sortOrder: number }
export type CatalogVariantOption = {
  id: string
  name: string
  priceDeltaCents: number
  isAvailable: boolean
  sortOrder: number
}
export type CatalogVariantGroup = {
  id: string
  name: string
  selectionType: "single" | "multiple"
  isRequired: boolean
  sortOrder: number
  options: CatalogVariantOption[]
}
export type CatalogProduct = {
  id: string
  categoryId: string | null
  name: string
  description: string | null
  priceCents: number
  photo: string | null
  isAvailable: boolean
  sortOrder: number
  variantGroups: CatalogVariantGroup[]
}
export type CatalogSettings = {
  isOpen: boolean
  isPaused: boolean
  deliveryFeeCents: number
  nextOpening: OpeningInfo | null
}

export type CatalogPendingOrder = {
  id: string
  orderNumber: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
}

async function loadSettings(
  deps: CatalogDeps,
  businessId: string
): Promise<CatalogSettings> {
  const rows = (await deps.sql`
    SELECT delivery_fee_cents, is_paused, hours
    FROM orders_settings
    WHERE business_id = ${businessId}
    LIMIT 1
  `) as SettingsRow[]

  const row = rows[0]
  const hours = (row?.hours ?? {}) as OrdersHours
  const isPaused = Boolean(row?.is_paused)
  const isOpen = !isPaused && isOpenNow(hours)
  const next = !isPaused && !isOpen ? nextOpening(hours) : null

  return {
    isOpen,
    isPaused,
    deliveryFeeCents: Number(row?.delivery_fee_cents ?? 0),
    nextOpening: next,
  }
}

export async function getCatalog(
  deps: CatalogDeps,
  input: { slug: string; clientId?: string }
): Promise<JsonResult> {
  const slug = input.slug?.trim() ?? ""
  if (!slug) {
    return { status: 400, body: { error: "Slug es requerido." } }
  }

  const business = await deps.getBusiness(slug)
  if (!business) {
    return { status: 404, body: { error: "Negocio no encontrado" } }
  }

  const categories = (await deps.sql`
    SELECT id, name, sort_order
    FROM product_categories
    WHERE business_id = ${business.id}
    ORDER BY sort_order ASC, name ASC
  `) as CategoryRow[]

  const products = (await deps.sql`
    SELECT id, category_id, name, description, price_cents, photo, is_available, sort_order
    FROM products
    WHERE business_id = ${business.id}
    ORDER BY sort_order ASC, name ASC
  `) as ProductRow[]

  const groups = (await deps.sql`
    SELECT g.id, g.product_id, g.name, g.selection_type, g.is_required, g.sort_order
    FROM product_variant_groups g
    JOIN products p ON p.id = g.product_id
    WHERE p.business_id = ${business.id}
    ORDER BY g.sort_order ASC
  `) as VariantGroupRow[]

  const options = (await deps.sql`
    SELECT o.id, o.group_id, o.name, o.price_delta_cents, o.is_available, o.sort_order
    FROM product_variant_options o
    JOIN product_variant_groups g ON g.id = o.group_id
    JOIN products p ON p.id = g.product_id
    WHERE p.business_id = ${business.id}
    ORDER BY o.sort_order ASC
  `) as VariantOptionRow[]

  const settings = await loadSettings(deps, business.id)

  const clientId = input.clientId?.trim() ?? ""
  const pendingRows = clientId
    ? ((await deps.sql`
        SELECT id, order_number, payment_method, payment_status
        FROM orders
        WHERE business_id = ${business.id}
          AND customer_id = ${clientId}
          AND status <> 'cancelled'
          AND (
            payment_status = 'pending_verification'
            OR (payment_method = 'mercadopago' AND payment_status = 'pending')
          )
        ORDER BY created_at DESC
        LIMIT 1
      `) as {
        id: string
        order_number: number
        payment_method: string
        payment_status: string
      }[])
    : []
  const pending = pendingRows[0]
  const pendingOrder: CatalogPendingOrder | null = pending
    ? {
        id: pending.id,
        orderNumber: Number(pending.order_number),
        paymentMethod: pending.payment_method as PaymentMethod,
        paymentStatus: pending.payment_status as PaymentStatus,
      }
    : null

  const optionsByGroup = new Map<string, CatalogVariantOption[]>()
  for (const o of options) {
    const list = optionsByGroup.get(o.group_id) ?? []
    list.push({
      id: o.id,
      name: o.name,
      priceDeltaCents: Number(o.price_delta_cents),
      isAvailable: Boolean(o.is_available),
      sortOrder: Number(o.sort_order),
    })
    optionsByGroup.set(o.group_id, list)
  }

  const groupsByProduct = new Map<string, CatalogVariantGroup[]>()
  for (const g of groups) {
    const list = groupsByProduct.get(g.product_id) ?? []
    list.push({
      id: g.id,
      name: g.name,
      selectionType: g.selection_type === "multiple" ? "multiple" : "single",
      isRequired: Boolean(g.is_required),
      sortOrder: Number(g.sort_order),
      options: optionsByGroup.get(g.id) ?? [],
    })
    groupsByProduct.set(g.product_id, list)
  }

  return {
    status: 200,
    body: {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: Number(c.sort_order),
      })),
      products: products.map((p) => ({
        id: p.id,
        categoryId: p.category_id,
        name: p.name,
        description: p.description,
        priceCents: Number(p.price_cents),
        photo: p.photo,
        isAvailable: Boolean(p.is_available),
        sortOrder: Number(p.sort_order),
        variantGroups: groupsByProduct.get(p.id) ?? [],
      })),
      settings,
      pendingOrder,
    },
  }
}
