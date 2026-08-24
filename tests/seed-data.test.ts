import { describe, expect, test } from "bun:test"
import {
  categories,
  demoCustomers,
  demoOrders,
  products,
  variantGroups,
  variantOptions,
} from "@/shell/db/seed-data"
import {
  FULFILLMENT_OPTIONS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/modules/orders/lib/types"

const categoryIds = new Set(categories.map((c) => c.id))
const productIds = new Set(products.map((p) => p.id))
const groupIds = new Set(variantGroups.map((g) => g.id))

describe("catálogo seed", () => {
  test("tiene al menos 20 productos", () => {
    expect(products.length).toBeGreaterThanOrEqual(20)
  })

  test("precios en centavos enteros y no negativos", () => {
    for (const p of products) {
      expect(Number.isInteger(p.priceCents)).toBe(true)
      expect(p.priceCents).toBeGreaterThanOrEqual(0)
    }
  })

  test("ids únicos en categorías, productos, grupos y opciones", () => {
    const uniq = <T>(xs: T[], key: (x: T) => string) =>
      new Set(xs.map(key)).size === xs.length
    expect(uniq(categories, (c) => c.id)).toBe(true)
    expect(uniq(products, (p) => p.id)).toBe(true)
    expect(uniq(variantGroups, (g) => g.id)).toBe(true)
    expect(uniq(variantOptions, (o) => o.id)).toBe(true)
  })

  test("cada producto apunta a una categoría existente y tiene nombre", () => {
    for (const p of products) {
      expect(categoryIds.has(p.categoryId)).toBe(true)
      expect(p.name.trim().length).toBeGreaterThan(0)
    }
  })

  test("cada grupo de variantes apunta a un producto existente", () => {
    for (const g of variantGroups) {
      expect(productIds.has(g.productId)).toBe(true)
      expect(["single", "multiple"]).toContain(g.selectionType)
    }
  })

  test("cada opción apunta a un grupo existente y delta entero", () => {
    for (const o of variantOptions) {
      expect(groupIds.has(o.groupId)).toBe(true)
      expect(Number.isInteger(o.priceDeltaCents)).toBe(true)
    }
  })
})

describe("órdenes demo", () => {
  test("ids únicos de clientes y pedidos", () => {
    expect(new Set(demoCustomers.map((c) => c.id)).size).toBe(demoCustomers.length)
    expect(new Set(demoOrders.map((o) => o.id)).size).toBe(demoOrders.length)
  })

  test("cada pedido referencia un cliente demo existente", () => {
    const customerIds = new Set(demoCustomers.map((c) => c.id))
    for (const o of demoOrders) {
      expect(customerIds.has(o.customerId)).toBe(true)
    }
  })

  test("estados, métodos y fulfillment dentro del dominio", () => {
    for (const o of demoOrders) {
      expect(ORDER_STATUSES).toContain(o.status)
      expect(PAYMENT_METHODS).toContain(o.paymentMethod)
      expect(PAYMENT_STATUSES).toContain(o.paymentStatus)
      expect(FULFILLMENT_OPTIONS).toContain(o.fulfillment)
    }
  })

  test("totales consistentes: total = subtotal + fee, subtotal = suma de ítems", () => {
    for (const o of demoOrders) {
      const subtotal = o.items.reduce(
        (acc, i) => acc + i.unitPriceCents * i.quantity,
        0
      )
      expect(o.subtotalCents).toBe(subtotal)
      expect(o.totalCents).toBe(o.subtotalCents + o.deliveryFeeCents)
    }
  })

  test("ítems con cantidad 1..20, precio entero y producto existente", () => {
    for (const o of demoOrders) {
      expect(o.items.length).toBeGreaterThan(0)
      for (const i of o.items) {
        expect(i.quantity).toBeGreaterThanOrEqual(1)
        expect(i.quantity).toBeLessThanOrEqual(20)
        expect(Number.isInteger(i.unitPriceCents)).toBe(true)
        if (i.productId) expect(productIds.has(i.productId)).toBe(true)
      }
    }
  })

  test("número de pedido correlativo único", () => {
    const numbers = demoOrders.map((o) => o.orderNumber)
    expect(new Set(numbers).size).toBe(numbers.length)
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(1)
  })
})
