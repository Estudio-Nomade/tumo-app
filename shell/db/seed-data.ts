import type {
  Fulfillment,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/modules/orders/lib/types"

/** UUID v4 determinístico para que el seed sea idempotente y referenciable. */
const uuid = (prefix: string, n: number): string =>
  `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`

// ──────────────────────────────────────────────────────────────
// Catálogo
// ──────────────────────────────────────────────────────────────

export type SeedCategory = { id: string; name: string; sortOrder: number }

export type SeedProduct = {
  id: string
  categoryId: string
  name: string
  description: string
  priceCents: number
  sortOrder: number
}

export type SeedVariantGroup = {
  id: string
  productId: string
  name: string
  selectionType: "single" | "multiple"
  isRequired: boolean
  sortOrder: number
}

export type SeedVariantOption = {
  id: string
  groupId: string
  name: string
  priceDeltaCents: number
  sortOrder: number
}

const CAT_HAMB = uuid("a1000000", 1)
const CAT_LOMITO = uuid("a1000000", 2)
const CAT_PAPAS = uuid("a1000000", 3)
const CAT_BEBIDAS = uuid("a1000000", 4)

export const categories: SeedCategory[] = [
  { id: CAT_HAMB, name: "Hamburguesas", sortOrder: 0 },
  { id: CAT_LOMITO, name: "Lomitos", sortOrder: 1 },
  { id: CAT_PAPAS, name: "Papas", sortOrder: 2 },
  { id: CAT_BEBIDAS, name: "Bebidas", sortOrder: 3 },
]

// ids de productos: b1000000-…-000000000001..20
const P = (n: number) => uuid("b1000000", n)

export const products: SeedProduct[] = [
  // Hamburguesas
  { id: P(1), categoryId: CAT_HAMB, name: "Hamburguesa Clásica", description: "Pan, carne, lechuga y tomate", priceCents: 4500, sortOrder: 0 },
  { id: P(2), categoryId: CAT_HAMB, name: "Hamburguesa Especial", description: "Doble carne, cheddar y panceta", priceCents: 5200, sortOrder: 1 },
  { id: P(3), categoryId: CAT_HAMB, name: "Hamburguesa Cheddar", description: "Carne, cheddar fundido y cebolla caramelizada", priceCents: 5200, sortOrder: 2 },
  { id: P(4), categoryId: CAT_HAMB, name: "Hamburguesa Vegetariana", description: "Medallón de lentejas, queso y rúcula", priceCents: 4300, sortOrder: 3 },
  { id: P(5), categoryId: CAT_HAMB, name: "Doble Carri", description: "Doble carne, doble cheddar, panceta y huevo", priceCents: 5800, sortOrder: 4 },
  { id: P(6), categoryId: CAT_HAMB, name: "Hamburguesa de Pollo", description: "Pechuga crocante, lechuga y mayonesa", priceCents: 4700, sortOrder: 5 },
  // Lomitos
  { id: P(7), categoryId: CAT_LOMITO, name: "Lomito Completo", description: "Lomo, jamón, queso y huevo", priceCents: 5800, sortOrder: 0 },
  { id: P(8), categoryId: CAT_LOMITO, name: "Lomito Simple", description: "Lomo, lechuga y tomate", priceCents: 4800, sortOrder: 1 },
  { id: P(9), categoryId: CAT_LOMITO, name: "Lomito de Pollo", description: "Pollo grillado, queso y lechuga", priceCents: 5000, sortOrder: 2 },
  { id: P(10), categoryId: CAT_LOMITO, name: "Lomito Especial", description: "Lomo, jamón, queso, huevo y panceta", priceCents: 6200, sortOrder: 3 },
  // Papas
  { id: P(11), categoryId: CAT_PAPAS, name: "Papas Fritas", description: "Porción para compartir", priceCents: 1800, sortOrder: 0 },
  { id: P(12), categoryId: CAT_PAPAS, name: "Papas con Cheddar", description: "Con salsa cheddar y panceta", priceCents: 2200, sortOrder: 1 },
  { id: P(13), categoryId: CAT_PAPAS, name: "Papas Carri", description: "Cheddar, panceta y verdeo", priceCents: 2600, sortOrder: 2 },
  { id: P(14), categoryId: CAT_PAPAS, name: "Papas a Caballo", description: "Con huevo frito arriba", priceCents: 2400, sortOrder: 3 },
  // Bebidas
  { id: P(15), categoryId: CAT_BEBIDAS, name: "Coca-Cola 500ml", description: "Botella fría", priceCents: 1200, sortOrder: 0 },
  { id: P(16), categoryId: CAT_BEBIDAS, name: "Agua Mineral", description: "Sin gas, 500ml", priceCents: 800, sortOrder: 1 },
  { id: P(17), categoryId: CAT_BEBIDAS, name: "Sprite 500ml", description: "Botella fría", priceCents: 1200, sortOrder: 2 },
  { id: P(18), categoryId: CAT_BEBIDAS, name: "Cerveza 473ml", description: "Lata bien helada", priceCents: 1800, sortOrder: 3 },
  { id: P(19), categoryId: CAT_BEBIDAS, name: "Gaseosa 1.5L", description: "Para compartir", priceCents: 1500, sortOrder: 4 },
  { id: P(20), categoryId: CAT_BEBIDAS, name: "Limonada Natural", description: "Limón, menta y jengibre", priceCents: 1300, sortOrder: 5 },
]

// Productos con variante "Tamaño" (single, required): burgers + lomitos.
const SIZE_PRODUCTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
// Productos con "Extras" (multiple).
const EXTRAS: Record<number, { id: number; name: string; delta: number }[]> = {
  2: [
    { id: 1, name: "Extra queso", delta: 400 },
    { id: 2, name: "Huevo", delta: 300 },
    { id: 3, name: "Panceta", delta: 500 },
  ],
  5: [
    { id: 1, name: "Extra queso", delta: 400 },
    { id: 2, name: "Huevo", delta: 300 },
    { id: 3, name: "Cheddar", delta: 400 },
  ],
  7: [
    { id: 1, name: "Jamón", delta: 400 },
    { id: 2, name: "Queso", delta: 400 },
    { id: 3, name: "Huevo", delta: 300 },
  ],
  11: [
    { id: 1, name: "Cheddar", delta: 400 },
    { id: 2, name: "Panceta", delta: 300 },
  ],
}

export const variantGroups: SeedVariantGroup[] = []
export const variantOptions: SeedVariantOption[] = []

let groupSeq = 0
let optionSeq = 0

for (const productN of SIZE_PRODUCTS) {
  const groupId = uuid("c1000000", ++groupSeq)
  variantGroups.push({
    id: groupId,
    productId: P(productN),
    name: "Tamaño",
    selectionType: "single",
    isRequired: true,
    sortOrder: 0,
  })
  variantOptions.push(
    { id: uuid("d1000000", ++optionSeq), groupId, name: "Chico", priceDeltaCents: 0, sortOrder: 0 },
    { id: uuid("d1000000", ++optionSeq), groupId, name: "Grande", priceDeltaCents: 800, sortOrder: 1 }
  )
}

for (const [productN, options] of Object.entries(EXTRAS)) {
  const groupId = uuid("c1000000", ++groupSeq)
  variantGroups.push({
    id: groupId,
    productId: P(Number(productN)),
    name: "Extras",
    selectionType: "multiple",
    isRequired: false,
    sortOrder: 1,
  })
  options.forEach((opt, i) => {
    variantOptions.push({
      id: uuid("d1000000", ++optionSeq),
      groupId,
      name: opt.name,
      priceDeltaCents: opt.delta,
      sortOrder: i,
    })
  })
}

// ──────────────────────────────────────────────────────────────
// Órdenes demo
// ──────────────────────────────────────────────────────────────

export type SeedCustomer = { id: string; name: string; phone: string; code: string }

export type SeedOrderItemVariant = {
  groupName: string
  optionName: string
  priceDeltaCents: number
}

export type SeedOrderItem = {
  id: string
  productId: string | null
  productName: string
  quantity: number
  unitPriceCents: number
  notes: string | null
  variants: SeedOrderItemVariant[]
}

export type SeedPayment = {
  id: string
  method: PaymentMethod
  status: PaymentStatus
}

export type SeedOrder = {
  id: string
  orderNumber: number
  customerId: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  fulfillment: Fulfillment
  deliveryAddress: string | null
  deliveryFeeCents: number
  subtotalCents: number
  totalCents: number
  notes: string | null
  items: SeedOrderItem[]
  payments: SeedPayment[]
}

const C = (n: number) => uuid("e1000000", n)
const O = (n: number) => uuid("f1000000", n)

export const demoCustomers: SeedCustomer[] = [
  { id: C(1), name: "María García", phone: "+5493514123456", code: "1001" },
  { id: C(2), name: "Roberto Díaz", phone: "+5493514234567", code: "1002" },
  { id: C(3), name: "Silvia López", phone: "+5493514345678", code: "1003" },
  { id: C(4), name: "Juan Carlos Pérez", phone: "+5493514456789", code: "1004" },
  { id: C(5), name: "Ana Torres", phone: "+5493514567890", code: "1005" },
  { id: C(6), name: "Pedro Gómez", phone: "+5493514678901", code: "1006" },
]

export const demoOrders: SeedOrder[] = [
  {
    id: O(1),
    orderNumber: 1,
    customerId: C(1),
    status: "pending",
    paymentMethod: "transfer",
    paymentStatus: "pending_receipt",
    fulfillment: "pickup",
    deliveryAddress: null,
    deliveryFeeCents: 0,
    subtotalCents: 14200,
    totalCents: 14200,
    notes: null,
    items: [
      {
        id: uuid("10100000", 1),
        productId: P(2),
        productName: "Hamburguesa Especial",
        quantity: 2,
        unitPriceCents: 6000,
        notes: null,
        variants: [{ groupName: "Tamaño", optionName: "Grande", priceDeltaCents: 800 }],
      },
      {
        id: uuid("10100000", 2),
        productId: P(12),
        productName: "Papas con Cheddar",
        quantity: 1,
        unitPriceCents: 2200,
        notes: null,
        variants: [],
      },
    ],
    payments: [],
  },
  {
    id: O(2),
    orderNumber: 2,
    customerId: C(2),
    status: "pending",
    paymentMethod: "transfer",
    paymentStatus: "pending_verification",
    fulfillment: "delivery",
    deliveryAddress: "Av. San Martín 1234, Villa Dolores",
    deliveryFeeCents: 500,
    subtotalCents: 7800,
    totalCents: 8300,
    notes: "Dejarlo en la puerta",
    items: [
      {
        id: uuid("10100000", 3),
        productId: P(7),
        productName: "Lomito Completo",
        quantity: 1,
        unitPriceCents: 6600,
        notes: null,
        variants: [{ groupName: "Tamaño", optionName: "Grande", priceDeltaCents: 800 }],
      },
      {
        id: uuid("10100000", 4),
        productId: P(15),
        productName: "Coca-Cola 500ml",
        quantity: 1,
        unitPriceCents: 1200,
        notes: null,
        variants: [],
      },
    ],
    payments: [
      { id: uuid("30100000", 1), method: "transfer", status: "pending_verification" },
    ],
  },
  {
    id: O(3),
    orderNumber: 3,
    customerId: C(3),
    status: "pending",
    paymentMethod: "at_pickup",
    paymentStatus: "unpaid",
    fulfillment: "pickup",
    deliveryAddress: null,
    deliveryFeeCents: 0,
    subtotalCents: 4300,
    totalCents: 4300,
    notes: null,
    items: [
      {
        id: uuid("10100000", 5),
        productId: P(4),
        productName: "Hamburguesa Vegetariana",
        quantity: 1,
        unitPriceCents: 4300,
        notes: null,
        variants: [{ groupName: "Tamaño", optionName: "Chico", priceDeltaCents: 0 }],
      },
    ],
    payments: [],
  },
  {
    id: O(4),
    orderNumber: 4,
    customerId: C(4),
    status: "confirmed",
    paymentMethod: "transfer",
    paymentStatus: "paid",
    fulfillment: "delivery",
    deliveryAddress: "Belgrano 450, Villa Dolores",
    deliveryFeeCents: 500,
    subtotalCents: 17200,
    totalCents: 17700,
    notes: "Sin sal en una",
    items: [
      {
        id: uuid("10100000", 6),
        productId: P(5),
        productName: "Doble Carri",
        quantity: 2,
        unitPriceCents: 7300,
        notes: "Sin sal",
        variants: [
          { groupName: "Tamaño", optionName: "Grande", priceDeltaCents: 800 },
          { groupName: "Extras", optionName: "Extra queso", priceDeltaCents: 400 },
          { groupName: "Extras", optionName: "Huevo", priceDeltaCents: 300 },
        ],
      },
      {
        id: uuid("10100000", 7),
        productId: P(13),
        productName: "Papas Carri",
        quantity: 1,
        unitPriceCents: 2600,
        notes: null,
        variants: [],
      },
    ],
    payments: [
      { id: uuid("30100000", 2), method: "transfer", status: "paid" },
    ],
  },
  {
    id: O(5),
    orderNumber: 5,
    customerId: C(5),
    status: "preparing",
    paymentMethod: "transfer",
    paymentStatus: "paid",
    fulfillment: "pickup",
    deliveryAddress: null,
    deliveryFeeCents: 0,
    subtotalCents: 7400,
    totalCents: 7400,
    notes: null,
    items: [
      {
        id: uuid("10100000", 8),
        productId: P(9),
        productName: "Lomito de Pollo",
        quantity: 1,
        unitPriceCents: 5800,
        notes: null,
        variants: [{ groupName: "Tamaño", optionName: "Grande", priceDeltaCents: 800 }],
      },
      {
        id: uuid("10100000", 9),
        productId: P(16),
        productName: "Agua Mineral",
        quantity: 2,
        unitPriceCents: 800,
        notes: null,
        variants: [],
      },
    ],
    payments: [
      { id: uuid("30100000", 3), method: "transfer", status: "paid" },
    ],
  },
  {
    id: O(6),
    orderNumber: 6,
    customerId: C(6),
    status: "completed",
    paymentMethod: "at_pickup",
    paymentStatus: "paid",
    fulfillment: "pickup",
    deliveryAddress: null,
    deliveryFeeCents: 0,
    subtotalCents: 15300,
    totalCents: 15300,
    notes: null,
    items: [
      {
        id: uuid("10100000", 10),
        productId: P(1),
        productName: "Hamburguesa Clásica",
        quantity: 3,
        unitPriceCents: 4500,
        notes: null,
        variants: [{ groupName: "Tamaño", optionName: "Chico", priceDeltaCents: 0 }],
      },
      {
        id: uuid("10100000", 11),
        productId: P(11),
        productName: "Papas Fritas",
        quantity: 1,
        unitPriceCents: 1800,
        notes: null,
        variants: [],
      },
    ],
    payments: [
      { id: uuid("30100000", 4), method: "at_pickup", status: "paid" },
    ],
  },
]
