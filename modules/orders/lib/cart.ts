export type CartVariant = {
  groupName: string
  optionName: string
  priceDeltaCents: number
  /** id de product_variant_options para revalidar en el server */
  optionId: string
}

export type CartItem = {
  /** identidad de línea: productId + combinación de variantes */
  key: string
  productId: string
  name: string
  basePriceCents: number
  quantity: number
  variants: CartVariant[]
  notes?: string
}

export const MAX_QUANTITY = 20

export function clampQuantity(q: number): number {
  const n = Math.round(q)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(MAX_QUANTITY, n)
}

export function cartItemKey(productId: string, variants: CartVariant[]): string {
  const sig = variants
    .map((v) => `${v.groupName}:${v.optionName}`)
    .sort()
    .join("|")
  return `${productId}::${sig}`
}

export function itemUnitPriceCents(item: CartItem): number {
  const delta = item.variants.reduce((s, v) => s + v.priceDeltaCents, 0)
  return item.basePriceCents + delta
}

export function cartSummary(
  items: CartItem[]
): { count: number; subtotalCents: number } {
  let count = 0
  let subtotal = 0
  for (const it of items) {
    count += it.quantity
    subtotal += itemUnitPriceCents(it) * it.quantity
  }
  return { count, subtotalCents: subtotal }
}

export function addItem(items: CartItem[], item: CartItem): CartItem[] {
  const idx = items.findIndex((i) => i.key === item.key)
  if (idx >= 0) {
    const next = [...items]
    next[idx] = {
      ...next[idx],
      quantity: clampQuantity(next[idx].quantity + item.quantity),
    }
    return next
  }
  return [...items, { ...item, quantity: clampQuantity(item.quantity) }]
}

export function removeItem(items: CartItem[], key: string): CartItem[] {
  return items.filter((i) => i.key !== key)
}

export function setQuantity(
  items: CartItem[],
  key: string,
  quantity: number
): CartItem[] {
  return items.map((i) =>
    i.key === key ? { ...i, quantity: clampQuantity(quantity) } : i
  )
}

type CartStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function resolveStorage(storage?: CartStorage): CartStorage | undefined {
  if (storage) return storage
  if (typeof localStorage !== "undefined") {
    return localStorage as unknown as CartStorage
  }
  return undefined
}

export function cartStorageKey(slug: string): string {
  return `tumo_cart_${slug}`
}

export function loadCart(slug: string, storage?: CartStorage): CartItem[] {
  const s = resolveStorage(storage)
  if (!s) return []
  const raw = s.getItem(cartStorageKey(slug))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as CartItem[]) : []
  } catch {
    return []
  }
}

export function saveCart(
  slug: string,
  items: CartItem[],
  storage?: CartStorage
): void {
  const s = resolveStorage(storage)
  if (!s) return
  s.setItem(cartStorageKey(slug), JSON.stringify(items))
}
