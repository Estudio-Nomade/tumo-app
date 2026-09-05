"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { CatalogProduct } from "@/modules/orders/api/catalog"
import {
  addItem,
  cartItemKey,
  cartSummary,
  loadCart,
  saveCart,
  type CartItem,
  type CartVariant,
} from "@/modules/orders/lib/cart"
import { formatCents } from "@/modules/orders/lib/types"
import OrdersPublicNav, {
  notifyOrdersCartChanged,
} from "@/modules/orders/public/orders-public-nav"

export default function ProductDetail({
  slug,
  productId,
}: {
  slug: string
  productId: string
}) {
  const router = useRouter()
  const [product, setProduct] = useState<CatalogProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [single, setSingle] = useState<Record<string, string>>({})
  const [multiple, setMultiple] = useState<Record<string, string[]>>({})
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState("")
  const [formError, setFormError] = useState("")

  useEffect(() => {
    let cancelled = false
    fetch(`/api/orders/catalog?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((json: { products?: CatalogProduct[] }) => {
        if (cancelled) return
        const found = (json.products ?? []).find((p) => p.id === productId)
        if (!found) {
          setError("No encontramos este producto")
          return
        }
        setProduct(found)
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar el producto.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug, productId])

  const selectedVariants = useMemo<CartVariant[]>(() => {
    if (!product) return []
    const out: CartVariant[] = []
    for (const g of product.variantGroups) {
      if (g.selectionType === "multiple") {
        const ids = multiple[g.id] ?? []
        for (const opt of g.options) {
          if (ids.includes(opt.id)) {
            out.push({ groupName: g.name, optionName: opt.name, priceDeltaCents: opt.priceDeltaCents, optionId: opt.id })
          }
        }
      } else {
        const id = single[g.id]
        const opt = g.options.find((o) => o.id === id)
        if (opt) out.push({ groupName: g.name, optionName: opt.name, priceDeltaCents: opt.priceDeltaCents, optionId: opt.id })
      }
    }
    return out
  }, [product, single, multiple])

  const unitPriceCents = useMemo(() => {
    if (!product) return 0
    const delta = selectedVariants.reduce((s, v) => s + v.priceDeltaCents, 0)
    return product.priceCents + delta
  }, [product, selectedVariants])

  const totalCents = unitPriceCents * quantity

  function toggleMultiple(groupId: string, optionId: string) {
    setMultiple((prev) => {
      const current = prev[groupId] ?? []
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId]
      return { ...prev, [groupId]: next }
    })
  }

  function missingRequired(): boolean {
    if (!product) return false
    for (const g of product.variantGroups) {
      if (!g.isRequired) continue
      if (g.selectionType === "multiple") {
        if ((multiple[g.id] ?? []).length === 0) return true
      } else if (!single[g.id]) {
        return true
      }
    }
    return false
  }

  function handleAdd() {
    if (!product || !product.isAvailable) return
    if (missingRequired()) {
      setFormError("Elegí una opción para cada grupo marcado")
      return
    }
    const item: CartItem = {
      key: cartItemKey(product.id, selectedVariants),
      productId: product.id,
      name: product.name,
      basePriceCents: product.priceCents,
      quantity,
      variants: selectedVariants,
      notes: note.trim() || undefined,
    }
    const next = addItem(loadCart(slug), item)
    saveCart(slug, next)
    notifyOrdersCartChanged()
    router.push(`/${slug}/orders`)
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-md p-4 pb-24">
        <div className="h-64 animate-pulse rounded-2xl bg-[#F5F5F4]" />
        <div className="mt-4 h-8 w-2/3 animate-pulse rounded bg-[#F5F5F4]" />
        <OrdersPublicNav slug={slug} />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 p-4 py-12 pb-24 text-center">
        <p className="text-base text-[var(--color-muted-public,#78716C)]">
          {error || "No encontramos este producto"}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/${slug}/orders`)}
          className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
        >
          Volver al menú
        </button>
        <OrdersPublicNav slug={slug} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md pb-36">
      <button
        type="button"
        onClick={() => router.push(`/${slug}/orders`)}
        className="min-h-[48px] px-4 text-base font-semibold text-[var(--color-primary,#F97316)]"
      >
        ← Volver
      </button>

      <div className="flex aspect-[4/3] w-full items-center justify-center bg-[#F5F5F4] text-[var(--color-muted-public,#78716C)]">
        {product.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.photo} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-base">Sin foto</span>
        )}
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--color-ink-public,#1C1917)]">
            {product.name}
          </h1>
          <p className="text-[22px] font-bold text-[var(--color-ink-public,#1C1917)]">
            $ {formatCents(product.priceCents)}
          </p>
        </div>

        {product.description ? (
          <p className="text-base text-[var(--color-muted-public,#78716C)]">
            {product.description}
          </p>
        ) : null}

        {product.variantGroups.map((group) => (
          <fieldset key={group.id} className="flex flex-col gap-2">
            <legend className="text-base font-semibold text-[var(--color-ink-public,#1C1917)]">
              {group.name}
              {group.selectionType === "multiple" ? " · Podés elegir varias" : " · Elegí una"}
            </legend>
            <div className="flex flex-col gap-2">
              {group.options.map((opt) => {
                const checked =
                  group.selectionType === "multiple"
                    ? (multiple[group.id] ?? []).includes(opt.id)
                    : single[group.id] === opt.id
                return (
                  <label
                    key={opt.id}
                    className="flex min-h-[56px] cursor-pointer items-center justify-between rounded-2xl border border-[#E7E5E4] bg-white px-4"
                  >
                    <span className="flex items-center gap-3 text-base text-[var(--color-ink-public,#1C1917)]">
                      <input
                        type={group.selectionType === "multiple" ? "checkbox" : "radio"}
                        name={group.id}
                        checked={checked}
                        onChange={() =>
                          group.selectionType === "multiple"
                            ? toggleMultiple(group.id, opt.id)
                            : setSingle((prev) => ({ ...prev, [group.id]: opt.id }))
                        }
                        className="h-5 w-5 accent-[var(--color-primary,#F97316)]"
                      />
                      {opt.name}
                    </span>
                    <span className="text-base font-semibold text-[var(--color-muted-public,#78716C)]">
                      {opt.priceDeltaCents > 0 ? `+$ ${formatCents(opt.priceDeltaCents)}` : "$ 0"}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        ))}

        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-[var(--color-ink-public,#1C1917)]">
            Cantidad
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Menos"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E7E5E4] text-[22px] font-bold"
            >
              −
            </button>
            <span className="w-8 text-center text-[22px] font-bold">{quantity}</span>
            <button
              type="button"
              aria-label="Más"
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E7E5E4] text-[22px] font-bold"
            >
              +
            </button>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-base font-semibold text-[var(--color-ink-public,#1C1917)]">
            ¿Algo que tengamos que saber? (opcional)
          </span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej. sin sal"
            className="min-h-[52px] rounded-2xl border border-[#E7E5E4] px-4 text-base outline-none focus:border-[var(--color-primary,#F97316)]"
          />
        </label>

        {formError ? (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {formError}
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 px-4 pb-2">
        <button
          type="button"
          disabled={!product.isAvailable}
          onClick={handleAdd}
          className="flex min-h-[56px] w-full max-w-md mx-auto items-center justify-center rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white disabled:bg-stone-300 disabled:text-stone-500"
        >
          {product.isAvailable ? `Agregar · $ ${formatCents(totalCents)}` : "Agotado hoy"}
        </button>
      </div>

      <OrdersPublicNav slug={slug} count={cartSummary(loadCart(slug)).count} />
    </div>
  )
}
