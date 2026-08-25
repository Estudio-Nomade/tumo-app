import { describe, expect, test } from "bun:test"
import {
  addItem,
  cartItemKey,
  cartSummary,
  clampQuantity,
  itemUnitPriceCents,
  clearCart,
  loadCart,
  loadLastGuest,
  removeItem,
  saveCart,
  saveLastGuest,
  setQuantity,
  type CartItem,
} from "@/modules/orders/lib/cart"

function item(partial: Partial<CartItem>): CartItem {
  return {
    key: cartItemKey("p1", [{ groupName: "Tamaño", optionName: "Grande", priceDeltaCents: 800, optionId: "o2" }]),
    productId: "p1",
    name: "Hamburguesa",
    basePriceCents: 4500,
    quantity: 1,
    variants: [{ groupName: "Tamaño", optionName: "Grande", priceDeltaCents: 800, optionId: "o2" }],
    ...partial,
  }
}

const grande = [{ groupName: "Tamaño", optionName: "Grande", priceDeltaCents: 800, optionId: "o2" }]
const chico = [{ groupName: "Tamaño", optionName: "Chico", priceDeltaCents: 0, optionId: "o1" }]

describe("itemUnitPriceCents", () => {
  test("base + deltas", () => {
    expect(itemUnitPriceCents(item({}))).toBe(5300)
  })
})

describe("cartItemKey", () => {
  test("determinístico y distinto según variantes", () => {
    const a = cartItemKey("p1", grande)
    const b = cartItemKey("p1", grande)
    const c = cartItemKey("p1", chico)
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})

describe("addItem", () => {
  test("agrega línea nueva", () => {
    const next = addItem([], item({}))
    expect(next).toHaveLength(1)
  })

  test("mergea misma clave sumando cantidad", () => {
    const next = addItem([item({ quantity: 1 })], item({ quantity: 1 }))
    expect(next).toHaveLength(1)
    expect(next[0].quantity).toBe(2)
  })

  test("no supera tope 20", () => {
    const next = addItem([item({ quantity: 19 })], item({ quantity: 5 }))
    expect(next[0].quantity).toBe(20)
  })
})

describe("removeItem", () => {
  test("quita la línea por clave", () => {
    const first = item({})
    const items = [first, item({ productId: "p2", key: "p2::" })]
    const next = removeItem(items, first.key)
    expect(next).toHaveLength(1)
    expect(next[0].productId).toBe("p2")
  })
})

describe("setQuantity", () => {
  test("clampa entre 1 y 20", () => {
    const it = item({ quantity: 2 })
    const items = [it]
    expect(setQuantity(items, it.key, 0)[0].quantity).toBe(1)
    expect(setQuantity(items, it.key, 99)[0].quantity).toBe(20)
    expect(setQuantity(items, it.key, 5)[0].quantity).toBe(5)
  })
})

describe("clampQuantity", () => {
  test("NaN/negativos → 1, >20 → 20", () => {
    expect(clampQuantity(NaN)).toBe(1)
    expect(clampQuantity(-1)).toBe(1)
    expect(clampQuantity(21)).toBe(20)
    expect(clampQuantity(3)).toBe(3)
  })
})

describe("cartSummary", () => {
  test("conteo de ítems y subtotal (base+deltas × cantidad)", () => {
    const items = [
      item({ quantity: 2 }), // 5300 × 2 = 10600
      { ...item({}), key: "p2::", productId: "p2", name: "Papas", basePriceCents: 1800, quantity: 1, variants: [] },
    ]
    expect(cartSummary(items)).toEqual({ count: 3, subtotalCents: 12400 })
  })

  test("carrito vacío → ceros", () => {
    expect(cartSummary([])).toEqual({ count: 0, subtotalCents: 0 })
  })
})

describe("loadCart / saveCart", () => {
  const store: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void } = {
    getItem: () => null,
    setItem: () => {},
  }

  test("sin storage → carrito vacío", () => {
    expect(loadCart("carri", undefined)).toEqual([])
  })

  test("persiste y recupera por slug", () => {
    const mem = new Map<string, string>()
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    }
    const items = [item({ quantity: 2 })]
    saveCart("carri", items, storage)
    expect(loadCart("carri", storage)).toHaveLength(1)
    expect(loadCart("otro", storage)).toEqual([])
    expect(mem.get("tumo_cart_carri")).toContain("Hamburguesa")
  })

  test("JSON corrupto → carrito vacío", () => {
    const storage = {
      getItem: () => "{not json",
      setItem: () => {},
    }
    expect(loadCart("carri", storage)).toEqual([])
  })

  test("no-string storage → vacío sin explotar", () => {
    expect(loadCart("carri", store)).toEqual([])
  })
})

describe("clearCart", () => {
  test("deja el carrito vacío en storage", () => {
    const mem = new Map<string, string>()
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    }
    saveCart("carri", [item({ quantity: 2 })], storage)
    clearCart("carri", storage)
    expect(loadCart("carri", storage)).toEqual([])
  })
})

describe("lastGuest", () => {
  test("guarda y recupera nombre y WhatsApp", () => {
    const mem = new Map<string, string>()
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    }
    saveLastGuest("carri", { name: "María", phone: "5491111111111" }, storage)
    expect(loadLastGuest("carri", storage)).toEqual({
      name: "María",
      phone: "5491111111111",
    })
    expect(loadLastGuest("otro", storage)).toBeNull()
  })
})
