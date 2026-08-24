"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useBusiness } from "@/shell/context/business"
import {
  addItem,
  cartItemKey,
  cartSummary,
  loadCart,
  saveCart,
  type CartItem,
} from "@/modules/orders/lib/cart"
import { formatCents } from "@/modules/orders/lib/types"
import { pendingOrderBanner } from "@/modules/orders/lib/pending-order"
import type {
  CatalogCategory,
  CatalogPendingOrder,
  CatalogProduct,
  CatalogSettings,
} from "@/modules/orders/api/catalog"

type CatalogData = {
  categories: CatalogCategory[]
  products: CatalogProduct[]
  settings: CatalogSettings
  pendingOrder: CatalogPendingOrder | null
}

export default function Catalog({ slug }: { slug: string }) {
  const business = useBusiness()
  const router = useRouter()
  const [data, setData] = useState<CatalogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>(() => loadCart(slug))
  const [retry, setRetry] = useState(0)
  const [toast, setToast] = useState("")

  useEffect(() => {
    let cancelled = false
    fetch(`/api/orders/catalog?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((json: CatalogData & { error?: string }) => {
        if (cancelled) return
        if (json.error) {
          setError(json.error)
          setData(null)
          return
        }
        setData(json)
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar el menú.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug, retry])

  function retryLoad() {
    setLoading(true)
    setError("")
    setRetry((n) => n + 1)
  }

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(""), 2500)
  }

  const open = data?.settings.isOpen ?? false
  const paused = data?.settings.isPaused ?? false
  const nextOpening = data?.settings.nextOpening ?? null
  const pendingOrder = data?.pendingOrder ?? null
  const pendingBannerMessage = pendingOrder
    ? pendingOrderBanner(pendingOrder.paymentMethod, pendingOrder.paymentStatus)
    : null

  function handleAdd(product: CatalogProduct) {
    if (!open || paused || !product.isAvailable) return
    if (product.variantGroups.length > 0) {
      router.push(`/${slug}/orders/producto/${product.id}`)
      return
    }
    const item: CartItem = {
      key: cartItemKey(product.id, []),
      productId: product.id,
      name: product.name,
      basePriceCents: product.priceCents,
      quantity: 1,
      variants: [],
    }
    const next = addItem(cart, item)
    setCart(next)
    saveCart(slug, next)
    showToast("Agregado ✓")
  }

  const visibleProducts = useMemo(() => {
    if (!data) return []
    if (!activeCategory) return data.products
    return data.products.filter((p) => p.categoryId === activeCategory)
  }, [data, activeCategory])

  const summary = cartSummary(cart)

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[var(--color-surface-public,#FFFFFF)] pb-24">
      <header className="sticky top-0 z-10 bg-[var(--color-surface-public,#FFFFFF)] px-4 pt-3 pb-2">
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--color-ink-public,#1C1917)]">
          {business.name}
        </h1>
        <p className="text-base text-[var(--color-muted-public,#78716C)]">
          Elegí lo que vas a pedir
        </p>
      </header>

      {pendingOrder && pendingBannerMessage ? (
        <Link
          href={`/${slug}/orders/${pendingOrder.id}`}
          role="status"
          className="mx-4 my-2 flex min-h-[56px] items-center justify-between gap-3 rounded-2xl bg-[var(--color-primary,#F97316)] px-4 py-3 text-base font-semibold text-white"
        >
          <span>{pendingBannerMessage}</span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}

      {paused ? (
        <div
          role="status"
          className="mx-4 my-2 rounded-2xl bg-amber-50 px-4 py-3 text-base font-medium text-amber-800"
        >
          Pausamos los pedidos por un rato. Volvé más tarde.
        </div>
      ) : !open ? (
        <div
          role="status"
          className="mx-4 my-2 rounded-2xl bg-amber-50 px-4 py-3 text-base font-medium text-amber-800"
        >
          Cerrado ahora
          {nextOpening
            ? ` · Abrimos ${nextOpening.dayLabel} a las ${nextOpening.time}`
            : ""}
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-3 px-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl bg-[#F5F5F4]"
            />
          ))}
        </div>
      ) : error ? (
        <div className="mx-4 flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-base text-[var(--color-muted-public,#78716C)]">
            No pudimos cargar el menú.
          </p>
          <button
            type="button"
            onClick={retryLoad}
            className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
          >
            Reintentar
          </button>
        </div>
      ) : data && data.products.length === 0 ? (
        <div className="mx-4 py-10 text-center text-base text-[var(--color-muted-public,#78716C)]">
          Todavía no hay menú cargado. Volvé más tarde.
        </div>
      ) : (
        <>
          <nav
            aria-label="Categorías"
            className="flex gap-2 overflow-x-auto px-4 py-2"
          >
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`min-h-[48px] shrink-0 rounded-full px-4 text-base font-semibold ${
                activeCategory === null
                  ? "bg-[var(--color-primary,#F97316)] text-white"
                  : "bg-[#F5F5F4] text-[var(--color-ink-public,#1C1917)]"
              }`}
            >
              Todas
            </button>
            {data?.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={`min-h-[48px] shrink-0 rounded-full px-4 text-base font-semibold ${
                  activeCategory === c.id
                    ? "bg-[var(--color-primary,#F97316)] text-white"
                    : "bg-[#F5F5F4] text-[var(--color-ink-public,#1C1917)]"
                }`}
              >
                {c.name}
              </button>
            ))}
          </nav>

          <ul className="flex flex-col gap-4 px-4">
            {visibleProducts.map((p) => (
              <li
                key={p.id}
                className={`overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white ${
                  p.isAvailable ? "" : "opacity-70"
                }`}
              >
                <div className="flex aspect-[4/3] w-full items-center justify-center bg-[#F5F5F4] text-[var(--color-muted-public,#78716C)]">
                  {p.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.photo}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-base">Sin foto</span>
                  )}
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <h2 className="text-[20px] font-bold leading-tight text-[var(--color-ink-public,#1C1917)]">
                    {p.name}
                  </h2>
                  {p.description ? (
                    <p className="line-clamp-2 text-base text-[var(--color-muted-public,#78716C)]">
                      {p.description}
                    </p>
                  ) : null}
                  <p className="text-[22px] font-bold text-[var(--color-ink-public,#1C1917)]">
                    $ {formatCents(p.priceCents)}
                  </p>
                  <button
                    type="button"
                    disabled={!open || paused || !p.isAvailable}
                    onClick={() => handleAdd(p)}
                    className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] text-base font-bold text-white disabled:bg-stone-300 disabled:text-stone-500"
                  >
                    {p.isAvailable ? "Agregar" : "Agotado hoy"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {summary.count > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link
            href={`/${slug}/orders/cart`}
            className="flex min-h-[56px] w-full max-w-md mx-auto items-center justify-between rounded-2xl bg-[var(--color-primary,#F97316)] px-5 text-base font-bold text-white shadow-lg"
          >
            <span>Ver mi pedido</span>
            <span>
              {summary.count} {summary.count === 1 ? "ítem" : "ítems"} · ${" "}
              {formatCents(summary.subtotalCents)}
            </span>
          </Link>
        </div>
      ) : null}

      {toast ? (
        <p
          role="status"
          className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-stone-900 px-5 py-3 text-base font-semibold text-white"
        >
          {toast}
        </p>
      ) : null}
    </div>
  )
}
