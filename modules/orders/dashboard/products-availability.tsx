"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

type Product = {
  id: string
  name: string
  categoryName: string | null
  priceCents: number
  isAvailable: boolean
}

export default function ProductsAvailability({ slug }: { slug: string }) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [retry, setRetry] = useState(0)
  const [toast, setToast] = useState("")

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(""), 2500)
  }

  useEffect(() => {
    let cancelled = false
    fetch("/api/orders/products")
      .then((res) => res.json())
      .then((data: { products?: Product[]; error?: string }) => {
        if (cancelled) return
        if (data.error) {
          setError(data.error)
          setProducts([])
        } else {
          setProducts(Array.isArray(data.products) ? data.products : [])
        }
      })
      .catch(() => {
        if (!cancelled) setError("No se pudieron cargar los productos.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [retry])

  async function toggle(p: Product) {
    const next = !p.isAvailable
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isAvailable: next } : x)))
    try {
      const res = await fetch(`/api/orders/products/${p.id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: next }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? "No se pudo actualizar.")
        setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isAvailable: p.isAvailable } : x)))
        return
      }
      showToast(`${p.name} ${next ? "marcada como disponible" : "marcada como agotada"}`)
    } catch {
      setError("No se pudo actualizar.")
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isAvailable: p.isAvailable } : x)))
    }
  }

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? products.filter((p) => p.name.toLowerCase().includes(q))
      : products
    const map = new Map<string, Product[]>()
    for (const p of filtered) {
      const key = p.categoryName ?? "Otros"
      const list = map.get(key) ?? []
      list.push(p)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [products, query])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => router.push(`/${slug}/dashboard/orders`)}
            className="min-h-[48px] text-left text-base font-semibold text-[var(--color-primary,#F97316)]"
          >
            ← Pedidos
          </button>
          <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
            Productos de hoy
          </h1>
        </div>
      </header>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar producto"
        aria-label="Buscar producto"
        className="h-[52px] w-full rounded-[14px] border-0 bg-[#F5F5F4] px-4 text-base text-stone-900 outline-none placeholder:text-stone-500 focus:ring-2 focus:ring-[var(--color-primary,#F97316)]/25"
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-[#F5F5F4]" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-base text-stone-600">No se pudieron cargar los productos.</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setError("")
              setRetry((n) => n + 1)
            }}
            className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
          >
            Reintentar
          </button>
        </div>
      ) : (
        grouped.map(([category, items]) => (
          <section key={category} className="flex flex-col gap-2">
            <h2 className="text-base font-bold text-stone-900">{category}</h2>
            <ul className="flex flex-col gap-2">
              {items.map((p) => (
                <li
                  key={p.id}
                  className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border border-[#E7E5E4] bg-white px-4 py-2"
                >
                  <span className="min-w-0 flex-1 text-base font-semibold text-stone-900">
                    {p.name}
                  </span>
                  <span className="text-sm font-semibold text-stone-500">
                    {p.isAvailable ? "Disponible" : "Agotado"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.isAvailable}
                    aria-label={p.isAvailable ? `Marcar ${p.name} agotado` : `Marcar ${p.name} disponible`}
                    onClick={() => void toggle(p)}
                    className={`flex h-[48px] w-16 items-center rounded-full p-1.5 transition ${
                      p.isAvailable ? "bg-green-500" : "bg-stone-300"
                    }`}
                  >
                    <span
                      className={`h-9 w-9 rounded-full bg-white shadow transition-transform ${
                        p.isAvailable ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {toast ? (
        <p
          role="status"
          className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800"
        >
          {toast}
        </p>
      ) : null}
    </div>
  )
}
