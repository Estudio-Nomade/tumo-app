import type { Business } from "@/lib/modules"
import { normalizePhone } from "@/lib/phone"
import type {
  Fulfillment,
  JsonResult,
  PaymentMethod,
  SqlTagged,
} from "@/modules/orders/lib/types"
import {
  FULFILLMENT_OPTIONS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  initialPaymentStatus,
  withTransaction,
} from "@/modules/orders/lib/types"
import {
  coerceHours,
  isOpenNow,
  nextOpening,
  type OrdersHours,
} from "@/modules/orders/lib/hours"

export type OrdersDeps = {
  sql: SqlTagged
  getBusiness: (slug: string) => Promise<Business | null>
  generateCode: () => string
  now?: () => Date
  notify?: (orderId: string, newStatus: string) => Promise<void>
}

export type OrderItemInput = {
  productId: string
  quantity: number
  variantOptionIds: string[]
  notes?: string
}

export type CreateOrderInput = {
  slug: string
  idempotencyKey: string
  name: string
  phone: string
  notes?: string
  fulfillment: Fulfillment
  deliveryAddress?: string
  paymentMethod: PaymentMethod
  items: OrderItemInput[]
}

type SettingsRow = {
  is_paused: boolean
  hours: OrdersHours | null
  delivery_fee_cents: number
}
type ProductRow = { id: string; name: string; price_cents: number; is_available: boolean }
type OptionRow = {
  id: string
  group_id: string
  group_name: string
  option_name: string
  price_delta_cents: number
}
type CustomerRow = { id: string; name: string; phone: string; code: string; business_id: string }
type OrderRow = {
  id: string
  order_number: number
  status: string
  payment_method: string
  payment_status: string
  fulfillment: string
  delivery_fee_cents: number
  subtotal_cents: number
  total_cents: number
  customer_code?: string
}

type OrderBody = {
  id: string
  orderNumber: number
  status: string
  paymentStatus: string
  paymentMethod: string
  fulfillment: string
  deliveryFeeCents: number
  subtotalCents: number
  totalCents: number
  customerCode: string
}

function fromIdempotencyRow(row: OrderRow): OrderBody {
  return {
    id: row.id,
    orderNumber: Number(row.order_number),
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    fulfillment: row.fulfillment,
    deliveryFeeCents: Number(row.delivery_fee_cents),
    subtotalCents: Number(row.subtotal_cents),
    totalCents: Number(row.total_cents),
    customerCode: row.customer_code ?? "",
  }
}

async function findCustomerByPhone(
  sql: SqlTagged,
  businessId: string,
  phoneDigits: string
): Promise<CustomerRow | undefined> {
  const rows = (await sql`
    SELECT id, name, phone, code, business_id
    FROM customers
    WHERE business_id = ${businessId}
      AND regexp_replace(phone, '[^0-9]', '', 'g') = ${phoneDigits}
    LIMIT 1
  `) as CustomerRow[]
  return rows[0]
}

export async function createOrder(
  deps: OrdersDeps,
  input: CreateOrderInput
): Promise<JsonResult> {
  const slug = input.slug?.trim() ?? ""
  const idempotencyKey = input.idempotencyKey?.trim() ?? ""
  const name = input.name?.trim() ?? ""
  const phoneDigits = normalizePhone(input.phone ?? "")
  const notes = input.notes?.trim() || null
  const deliveryAddress = input.deliveryAddress?.trim() || null
  const fulfillment = input.fulfillment
  const paymentMethod = input.paymentMethod
  const items = Array.isArray(input.items) ? input.items : []

  if (!slug || !idempotencyKey) {
    return { status: 400, body: { error: "Datos incompletos." } }
  }
  if (!name) {
    return { status: 400, body: { error: "Tu nombre es requerido." } }
  }
  if (phoneDigits.length < 10) {
    return { status: 400, body: { error: "Escribí un WhatsApp válido." } }
  }
  if (!FULFILLMENT_OPTIONS.includes(fulfillment)) {
    return { status: 400, body: { error: "Elegí cómo recibir el pedido." } }
  }
  if (fulfillment === "delivery" && !deliveryAddress) {
    return { status: 400, body: { error: "Escribí la dirección." } }
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return { status: 400, body: { error: "Elegí un método de pago." } }
  }
  if (items.length === 0) {
    return { status: 400, body: { error: "Tu pedido está vacío." } }
  }
  for (const it of items) {
    const qty = Number(it.quantity)
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return { status: 400, body: { error: "Cantidad no válida." } }
    }
  }

  const business = await deps.getBusiness(slug)
  if (!business) {
    return { status: 404, body: { error: "Negocio no encontrado" } }
  }
  if (!business.active_modules.includes("orders")) {
    return { status: 404, body: { error: "Este negocio no recibe pedidos." } }
  }

  const now = deps.now?.() ?? new Date()

  const settings = (await deps.sql`
    SELECT is_paused, hours, delivery_fee_cents
    FROM orders_settings
    WHERE business_id = ${business.id}
    LIMIT 1
  `) as SettingsRow[]
  const hours = coerceHours(settings[0]?.hours)
  const isPaused = Boolean(settings[0]?.is_paused)
  const deliveryFeeCents = Number(settings[0]?.delivery_fee_cents ?? 0)

  if (isPaused) {
    return {
      status: 409,
      body: { error: "Pausamos los pedidos por un rato. Volvé más tarde.", code: "PAUSED" },
    }
  }
  if (!isOpenNow(hours, now)) {
    const next = nextOpening(hours, now)
    const suffix = next ? ` Abrimos ${next.dayLabel} a las ${next.time}.` : ""
    return {
      status: 409,
      body: { error: `Cerramos hace un rato.${suffix}`, code: "CLOSED" },
    }
  }

  const existing = (await deps.sql`
    SELECT o.id, o.order_number, o.status, o.payment_method, o.payment_status,
           o.fulfillment, o.delivery_fee_cents, o.subtotal_cents, o.total_cents,
           c.code AS customer_code
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.idempotency_key = ${idempotencyKey} AND o.business_id = ${business.id}
    LIMIT 1
  `) as OrderRow[]
  if (existing[0]) {
    return { status: 200, body: { ...fromIdempotencyRow(existing[0]), existing: true } }
  }

  const productIds = items.map((it) => it.productId)
  const products = (await deps.sql`
    SELECT id, name, price_cents, is_available
    FROM products
    WHERE business_id = ${business.id} AND id = ANY(${productIds})
  `) as ProductRow[]
  const productById = new Map(products.map((p) => [p.id, p]))

  const allOptionIds = items.flatMap((it) => it.variantOptionIds ?? [])
  const options = allOptionIds.length
    ? ((await deps.sql`
        SELECT o.id, o.group_id, g.name AS group_name, o.name AS option_name, o.price_delta_cents
        FROM product_variant_options o
        JOIN product_variant_groups g ON g.id = o.group_id
        JOIN products p ON p.id = g.product_id
        WHERE p.business_id = ${business.id} AND o.id = ANY(${allOptionIds})
      `) as OptionRow[])
    : ([] as OptionRow[])
  const optionById = new Map(options.map((o) => [o.id, o]))

  // Revalidación de disponibilidad y precios (server es la fuente de verdad).
  const unavailable = items
    .map((it) => productById.get(it.productId))
    .filter((p) => !p || !p.is_available)
    .map((p) => ({ productId: p?.id, name: p?.name ?? "Producto" }))
  if (unavailable.length > 0) {
    return {
      status: 409,
      body: {
        error: "Se agotó X, lo sacamos de tu pedido. Revisá y confirmá de nuevo.",
        code: "ITEMS_UNAVAILABLE",
        items: unavailable,
      },
    }
  }

  // Totales server-side: base + deltas de variantes seleccionadas.
  let subtotalCents = 0
  const pricedItems = items.map((it) => {
    const product = productById.get(it.productId)!
    const deltas = (it.variantOptionIds ?? []).reduce((sum, id) => {
      const opt = optionById.get(id)
      return sum + Number(opt?.price_delta_cents ?? 0)
    }, 0)
    const unitPriceCents = Number(product.price_cents) + deltas
    subtotalCents += unitPriceCents * it.quantity
    return { input: it, product, unitPriceCents }
  })

  const fee = fulfillment === "delivery" ? deliveryFeeCents : 0
  const totalCents = subtotalCents + fee
  const paymentStatus = initialPaymentStatus(paymentMethod)

  const result = await withTransaction(deps.sql, async (tx) => {
    // Serializa por negocio para order_number correlativo.
    await tx`
      SELECT business_id FROM orders_settings WHERE business_id = ${business.id} FOR UPDATE
    `

    const [numRow] = (await tx`
      SELECT COALESCE(MAX(order_number), 0)::int + 1 AS next
      FROM orders
      WHERE business_id = ${business.id}
    `) as { next: number | string }[]
    const orderNumber = Number(numRow?.next ?? 1)

    let customer = await findCustomerByPhone(tx, business.id, phoneDigits)
    if (!customer) {
      let code = ""
      for (let i = 0; i < 10 && !customer; i++) {
        code = deps.generateCode()
        const collision = (await tx`
          SELECT id FROM customers WHERE code = ${code} AND business_id = ${business.id} LIMIT 1
        `) as { id: string }[]
        if (collision[0]) continue
        const created = (await tx`
          INSERT INTO customers (name, phone, code, business_id)
          VALUES (${name}, ${phoneDigits}, ${code}, ${business.id})
          RETURNING id, name, phone, code, business_id
        `) as CustomerRow[]
        customer = created[0]
      }
      if (!customer) {
        throw new Error("No pudimos generar un código único.")
      }
    }

    const inserted = (await tx`
      INSERT INTO orders (
        business_id, customer_id, order_number, status,
        payment_method, payment_status, fulfillment, delivery_address,
        delivery_fee_cents, subtotal_cents, total_cents, notes, idempotency_key
      )
      VALUES (
        ${business.id}, ${customer.id}, ${orderNumber}, 'pending',
        ${paymentMethod}, ${paymentStatus}, ${fulfillment}, ${deliveryAddress},
        ${fee}, ${subtotalCents}, ${totalCents}, ${notes}, ${idempotencyKey}
      )
      RETURNING id
    `) as { id: string }[]

    const orderId = inserted[0].id
    for (const priced of pricedItems) {
      const itemRows = (await tx`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price_cents, notes)
        VALUES (
          ${orderId}, ${priced.product.id}, ${priced.product.name},
          ${priced.input.quantity}, ${priced.unitPriceCents}, ${priced.input.notes?.trim() || null}
        )
        RETURNING id
      `) as { id: string }[]
      const itemId = itemRows[0].id

      for (const optionId of priced.input.variantOptionIds ?? []) {
        const opt = optionById.get(optionId)
        if (!opt) continue
        await tx`
          INSERT INTO order_item_variants (order_item_id, group_name, option_name, price_delta_cents)
          VALUES (${itemId}, ${opt.group_name}, ${opt.option_name}, ${Number(opt.price_delta_cents)})
        `
      }
    }

    return {
      id: orderId,
      orderNumber,
      status: "pending",
      paymentStatus,
      paymentMethod,
      fulfillment,
      deliveryFeeCents: fee,
      subtotalCents,
      totalCents,
      customerCode: customer.code,
      customerId: customer.id,
    }
  })

  return { status: 200, body: result }
}

export async function getOrder(
  deps: OrdersDeps,
  input: { id: string; clientId?: string }
): Promise<JsonResult> {
  const id = input.id?.trim() ?? ""
  if (!id) {
    return { status: 400, body: { error: "Id de pedido requerido." } }
  }

  const rows = (await deps.sql`
    SELECT o.id, o.business_id, o.customer_id, o.order_number, o.status,
           o.payment_method, o.payment_status, o.fulfillment, o.delivery_address,
           o.delivery_fee_cents, o.subtotal_cents, o.total_cents, o.notes, o.created_at,
           c.code AS customer_code, c.name AS customer_name, c.phone AS customer_phone
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ${id}
    LIMIT 1
  `) as {
    id: string
    business_id: string
    customer_id: string
    order_number: number
    status: string
    payment_method: string
    payment_status: string
    fulfillment: string
    delivery_address: string | null
    delivery_fee_cents: number
    subtotal_cents: number
    total_cents: number
    notes: string | null
    customer_code: string
    customer_name: string
    customer_phone: string
  }[]

  const order = rows[0]
  if (!order) {
    return { status: 404, body: { error: "No encontramos ese pedido." } }
  }
  if (input.clientId && order.customer_id !== input.clientId) {
    return { status: 403, body: { error: "No tenés acceso a ese pedido." } }
  }

  const items = (await deps.sql`
    SELECT id, product_id, product_name, quantity, unit_price_cents, notes
    FROM order_items
    WHERE order_id = ${order.id}
    ORDER BY created_at ASC
  `) as {
    id: string
    product_name: string
    quantity: number
    unit_price_cents: number
    notes: string | null
  }[]

  const itemIds = items.map((i) => i.id)
  const variants = itemIds.length
    ? ((await deps.sql`
        SELECT order_item_id, group_name, option_name, price_delta_cents
        FROM order_item_variants
        WHERE order_item_id = ANY(${itemIds})
      `) as { order_item_id: string; group_name: string; option_name: string; price_delta_cents: number }[])
    : ([] as { order_item_id: string; group_name: string; option_name: string; price_delta_cents: number }[])

  const settings = (await deps.sql`
    SELECT transfer_alias, transfer_cbu, transfer_holder, mp_enabled
    FROM orders_settings
    WHERE business_id = ${order.business_id}
    LIMIT 1
  `) as { transfer_alias: string | null; transfer_cbu: string | null; transfer_holder: string | null; mp_enabled: boolean }[]

  const payments = (await deps.sql`
    SELECT status, receipt_mime, encode(receipt_image, 'base64') AS receipt_base64, created_at
    FROM order_payments
    WHERE order_id = ${order.id}
    ORDER BY created_at DESC
    LIMIT 1
  `) as { status: string; receipt_mime: string | null; receipt_base64: string | null; created_at: Date | string }[]

  const variantsByItem = new Map<string, typeof variants>()
  for (const v of variants) {
    const list = variantsByItem.get(v.order_item_id) ?? []
    list.push(v)
    variantsByItem.set(v.order_item_id, list)
  }

  return {
    status: 200,
    body: {
      id: order.id,
      orderNumber: Number(order.order_number),
      status: order.status,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      fulfillment: order.fulfillment,
      deliveryAddress: order.delivery_address,
      deliveryFeeCents: Number(order.delivery_fee_cents),
      subtotalCents: Number(order.subtotal_cents),
      totalCents: Number(order.total_cents),
      notes: order.notes,
      customer: {
        id: order.customer_id,
        name: order.customer_name,
        phone: order.customer_phone,
        code: order.customer_code,
      },
      items: items.map((i) => ({
        id: i.id,
        productName: i.product_name,
        quantity: Number(i.quantity),
        unitPriceCents: Number(i.unit_price_cents),
        notes: i.notes,
        variants: (variantsByItem.get(i.id) ?? []).map((v) => ({
          groupName: v.group_name,
          optionName: v.option_name,
          priceDeltaCents: Number(v.price_delta_cents),
        })),
      })),
      transfer: settings[0]
        ? {
            alias: settings[0].transfer_alias,
            cbu: settings[0].transfer_cbu,
            holder: settings[0].transfer_holder,
          }
        : null,
      mpEnabled: Boolean(settings[0]?.mp_enabled),
      payment: payments[0]
        ? {
            status: payments[0].status,
            receiptMime: payments[0].receipt_mime,
            receiptBase64: payments[0].receipt_base64,
          }
        : null,
    },
  }
}

const ALLOWED_RECEIPT_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]
const MAX_RECEIPT_BYTES = 3 * 1024 * 1024

export async function uploadReceipt(
  deps: OrdersDeps,
  input: { orderId: string; mime: string; data: Uint8Array }
): Promise<JsonResult> {
  const orderId = input.orderId?.trim() ?? ""
  const mime = input.mime?.trim().toLowerCase() ?? ""
  const data = input.data

  if (!orderId) {
    return { status: 400, body: { error: "Id de pedido requerido." } }
  }
  if (!ALLOWED_RECEIPT_MIMES.includes(mime)) {
    return {
      status: 400,
      body: { error: "Subí una foto del comprobante (JPG o PNG)." },
    }
  }
  if (!data || data.byteLength === 0 || data.byteLength > MAX_RECEIPT_BYTES) {
    return { status: 400, body: { error: "La foto es muy pesada." } }
  }

  const rows = (await deps.sql`
    SELECT id, payment_method, payment_status, status
    FROM orders
    WHERE id = ${orderId}
    LIMIT 1
  `) as {
    id: string
    payment_method: string
    payment_status: string
    status: string
  }[]
  const order = rows[0]
  if (!order) {
    return { status: 404, body: { error: "No encontramos ese pedido." } }
  }
  if (order.payment_status !== "pending_receipt" && order.payment_status !== "rejected") {
    return {
      status: 409,
      body: { error: "Este pedido no está esperando un comprobante." },
    }
  }

  await withTransaction(deps.sql, async (tx) => {
    await tx`
      INSERT INTO order_payments (order_id, method, status, receipt_image, receipt_mime)
      VALUES (${orderId}, 'transfer', 'pending_verification', ${data}, ${mime})
    `
    await tx`
      UPDATE orders SET payment_status = 'pending_verification', updated_at = now()
      WHERE id = ${orderId}
    `
  })

  return { status: 200, body: { paymentStatus: "pending_verification" } }
}

export async function changePaymentMethod(
  deps: OrdersDeps,
  input: { orderId: string; paymentMethod: PaymentMethod }
): Promise<JsonResult> {
  const orderId = input.orderId?.trim() ?? ""
  const method = input.paymentMethod

  if (!orderId) {
    return { status: 400, body: { error: "Id de pedido requerido." } }
  }
  if (!PAYMENT_METHODS.includes(method)) {
    return { status: 400, body: { error: "Elegí un método de pago." } }
  }

  const rows = (await deps.sql`
    SELECT id, status, payment_method
    FROM orders
    WHERE id = ${orderId}
    LIMIT 1
  `) as { id: string; status: string; payment_method: string }[]
  const order = rows[0]
  if (!order) {
    return { status: 404, body: { error: "No encontramos ese pedido." } }
  }
  if (order.status !== "pending") {
    return {
      status: 409,
      body: { error: "Ya no se puede cambiar el método de pago." },
    }
  }

  const paymentStatus = initialPaymentStatus(method)
  await deps.sql`
    UPDATE orders
    SET payment_method = ${method}, payment_status = ${paymentStatus}, updated_at = now()
    WHERE id = ${orderId}
  `

  return { status: 200, body: { paymentMethod: method, paymentStatus } }
}

export type OrderStatusFilter = "new" | "preparing" | "ready" | "completed" | "all"

const FILTER_STATUSES: Record<Exclude<OrderStatusFilter, "all">, string[]> = {
  new: ["pending", "confirmed"],
  preparing: ["preparing"],
  ready: ["ready"],
  completed: ["completed"],
}

type OrderListRow = {
  id: string
  order_number: number
  status: string
  payment_method: string
  payment_status: string
  total_cents: number
  created_at: Date | string
  customer_name: string
  customer_phone: string
  items_summary: string | null
}

export async function listOrders(
  deps: OrdersDeps,
  input: { businessId: string; statusFilter?: OrderStatusFilter }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }

  const statuses =
    input.statusFilter && input.statusFilter !== "all"
      ? FILTER_STATUSES[input.statusFilter]
      : null

  const rows = statuses
    ? ((await deps.sql`
        SELECT o.id, o.order_number, o.status, o.payment_method, o.payment_status,
               o.total_cents, o.created_at,
               c.name AS customer_name, c.phone AS customer_phone,
               (SELECT string_agg(oi.quantity || 'x ' || oi.product_name, ', ')
                FROM order_items oi WHERE oi.order_id = o.id) AS items_summary
        FROM orders o
        JOIN customers c ON c.id = o.customer_id
        WHERE o.business_id = ${businessId}
          AND o.created_at >= date_trunc('day', now())
          AND o.status = ANY(${statuses})
        ORDER BY o.created_at DESC
        LIMIT 200
      `) as OrderListRow[])
    : ((await deps.sql`
        SELECT o.id, o.order_number, o.status, o.payment_method, o.payment_status,
               o.total_cents, o.created_at,
               c.name AS customer_name, c.phone AS customer_phone,
               (SELECT string_agg(oi.quantity || 'x ' || oi.product_name, ', ')
                FROM order_items oi WHERE oi.order_id = o.id) AS items_summary
        FROM orders o
        JOIN customers c ON c.id = o.customer_id
        WHERE o.business_id = ${businessId}
          AND o.created_at >= date_trunc('day', now())
        ORDER BY o.created_at DESC
        LIMIT 200
      `) as OrderListRow[])

  return {
    status: 200,
    body: {
      orders: rows.map((r) => ({
        id: r.id,
        orderNumber: Number(r.order_number),
        status: r.status,
        paymentMethod: r.payment_method,
        paymentStatus: r.payment_status,
        totalCents: Number(r.total_cents),
        createdAt: r.created_at instanceof Date ? r.created_at.getTime() : new Date(r.created_at).getTime(),
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        itemsSummary: r.items_summary ?? "",
      })),
    },
  }
}

const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "completed",
}

/** Notifica de forma best-effort: un fallo no revierte el cambio de estado. */
async function safeNotify(
  deps: OrdersDeps,
  orderId: string,
  newStatus: string
): Promise<void> {
  try {
    await deps.notify?.(orderId, newStatus)
  } catch {
    // ignorar: la notificación es accesoria al flujo del pedido.
  }
}

export async function transitionStatus(
  deps: OrdersDeps,
  input: { orderId: string; newStatus: string }
): Promise<JsonResult> {
  const orderId = input.orderId?.trim() ?? ""
  const newStatus = input.newStatus

  if (!orderId) {
    return { status: 400, body: { error: "Id de pedido requerido." } }
  }
  if (!ORDER_STATUSES.includes(newStatus as never)) {
    return { status: 400, body: { error: "Estado inválido." } }
  }

  const rows = (await deps.sql`
    SELECT id, status, payment_status FROM orders WHERE id = ${orderId} LIMIT 1
  `) as { id: string; status: string; payment_status: string }[]
  const order = rows[0]
  if (!order) {
    return { status: 404, body: { error: "No encontramos ese pedido." } }
  }
  if (order.status === "completed" || order.status === "cancelled") {
    return { status: 409, body: { error: "Este pedido ya está cerrado." } }
  }
  if (NEXT_STATUS[order.status] !== newStatus) {
    return { status: 400, body: { error: "No es el siguiente paso." } }
  }

  await deps.sql`
    UPDATE orders SET status = ${newStatus}, updated_at = now() WHERE id = ${orderId}
  `
  await safeNotify(deps, orderId, newStatus)
  return { status: 200, body: { status: newStatus } }
}

export async function verifyPayment(
  deps: OrdersDeps,
  input: { orderId: string; action: "approve" | "reject"; reason?: string }
): Promise<JsonResult> {
  const orderId = input.orderId?.trim() ?? ""
  const action = input.action

  if (!orderId) {
    return { status: 400, body: { error: "Id de pedido requerido." } }
  }
  if (action !== "approve" && action !== "reject") {
    return { status: 400, body: { error: "Acción inválida." } }
  }

  const rows = (await deps.sql`
    SELECT id, status, payment_status FROM orders WHERE id = ${orderId} LIMIT 1
  `) as { id: string; status: string; payment_status: string }[]
  const order = rows[0]
  if (!order) {
    return { status: 404, body: { error: "No encontramos ese pedido." } }
  }

  if (action === "reject") {
    const rejected = "rejected"
    await deps.sql`
      UPDATE orders SET payment_status = ${rejected}, updated_at = now() WHERE id = ${orderId}
    `
    await safeNotify(deps, orderId, "rejected")
    return { status: 200, body: { paymentStatus: "rejected", status: order.status } }
  }

  const newStatus = order.status === "pending" ? "confirmed" : order.status
  const paid = "paid"
  await deps.sql`
    UPDATE orders SET payment_status = ${paid}, status = ${newStatus}, updated_at = now()
    WHERE id = ${orderId}
  `
  if (order.status === "pending") {
    await safeNotify(deps, orderId, "confirmed")
  }
  return { status: 200, body: { paymentStatus: "paid", status: newStatus } }
}

export async function cancelOrder(
  deps: OrdersDeps,
  input: { orderId: string; reason?: string }
): Promise<JsonResult> {
  const orderId = input.orderId?.trim() ?? ""

  if (!orderId) {
    return { status: 400, body: { error: "Id de pedido requerido." } }
  }

  const rows = (await deps.sql`
    SELECT id, status, payment_status FROM orders WHERE id = ${orderId} LIMIT 1
  `) as { id: string; status: string; payment_status: string }[]
  const order = rows[0]
  if (!order) {
    return { status: 404, body: { error: "No encontramos ese pedido." } }
  }
  if (order.status === "completed" || order.status === "cancelled") {
    return { status: 409, body: { error: "Este pedido ya está cerrado." } }
  }

  const cancelled = "cancelled"
  await deps.sql`
    UPDATE orders SET status = ${cancelled}, updated_at = now() WHERE id = ${orderId}
  `
  return { status: 200, body: { status: "cancelled" } }
}
