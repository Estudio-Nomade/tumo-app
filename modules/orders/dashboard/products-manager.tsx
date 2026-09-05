"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { formatCents } from "@/modules/orders/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type VariantOption = { name: string; priceDeltaCents: number }
type VariantGroup = {
  name: string
  selectionType: "single" | "multiple"
  isRequired: boolean
  options: VariantOption[]
}

type ProductPhoto = { id: string; url: string; sortOrder: number }

type Product = {
  id: string
  name: string
  description: string | null
  photo: string | null
  photos?: ProductPhoto[]
  categoryId: string | null
  categoryName: string | null
  priceCents: number
  isAvailable: boolean
  variantGroups: (VariantGroup & { id?: string; options: (VariantOption & { id?: string })[] })[]
}

type Category = { id: string; name: string }

type Draft = {
  name: string
  price: string
  description: string
  categoryId: string
  groups: VariantGroup[]
}

const MAX_PHOTOS = 8

const emptyDraft = (): Draft => ({
  name: "",
  price: "",
  description: "",
  categoryId: "",
  groups: [],
})

function fromProduct(p: Product): Draft {
  return {
    name: p.name,
    price: String(p.priceCents),
    description: p.description ?? "",
    categoryId: p.categoryId ?? "",
    groups: (p.variantGroups ?? []).map((g) => ({
      name: g.name,
      selectionType: g.selectionType === "multiple" ? "multiple" : "single",
      isRequired: Boolean(g.isRequired),
      options: (g.options ?? []).map((o) => ({
        name: o.name,
        priceDeltaCents: Number(o.priceDeltaCents),
      })),
    })),
  }
}

export default function ProductsManager({ slug }: { slug: string }) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)
  const [query, setQuery] = useState("")
  const [toast, setToast] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [editPhotos, setEditPhotos] = useState<ProductPhoto[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [photoError, setPhotoError] = useState("")
  const formOpenRef = useRef(formOpen)
  const editingIdRef = useRef(editing?.id)
  useEffect(() => {
    formOpenRef.current = formOpen
    editingIdRef.current = editing?.id
  }, [formOpen, editing?.id])

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(""), 2500)
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/orders/products").then((r) => r.json()),
      fetch("/api/orders/products/categories").then((r) => r.json()),
    ])
      .then(([prod, cats]: [{ products?: Product[]; error?: string }, { categories?: Category[] }]) => {
        if (cancelled) return
        if (prod.error) {
          setError(prod.error)
          setProducts([])
        } else {
          const list = Array.isArray(prod.products) ? prod.products : []
          setProducts(list)
          const openId = formOpenRef.current ? editingIdRef.current : undefined
          if (openId) {
            const fresh = list.find((p) => p.id === openId)
            if (fresh) {
              setEditing((cur) => (cur ? { ...cur, ...fresh } : cur))
              setEditPhotos(
                Array.isArray(fresh.photos) && fresh.photos.length
                  ? [...fresh.photos].sort((a, b) => a.sortOrder - b.sortOrder)
                  : fresh.photo
                    ? [{ id: "cover", url: fresh.photo, sortOrder: 0 }]
                    : []
              )
            }
          }
        }
        setCategories(Array.isArray(cats.categories) ? cats.categories : [])
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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, query])

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
        setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isAvailable: p.isAvailable } : x)))
        showToast("No se pudo actualizar.")
        return
      }
      showToast(`${p.name} ${next ? "marcada como disponible" : "marcada como agotada"}`)
    } catch {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isAvailable: p.isAvailable } : x)))
    }
  }

  function openNew() {
    setEditing(null)
    setDraft(emptyDraft())
    setEditPhotos([])
    setPhotoError("")
    setFormError("")
    setFormOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setDraft(fromProduct(p))
    setEditPhotos(
      Array.isArray(p.photos) && p.photos.length
        ? [...p.photos].sort((a, b) => a.sortOrder - b.sortOrder)
        : p.photo
          ? [{ id: "cover", url: p.photo, sortOrder: 0 }]
          : []
    )
    setPhotoError("")
    setFormError("")
    setFormOpen(true)
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length || !editing?.id) return
    setPhotoError("")
    const remaining = MAX_PHOTOS - editPhotos.filter((p) => p.id !== "cover").length
    if (remaining <= 0) {
      setPhotoError("Podés subir hasta 8 fotos.")
      return
    }
    const all = Array.from(files)
    if (all.length > remaining) {
      setPhotoError("Podés subir hasta 8 fotos.")
    }
    const list = all.slice(0, remaining)
    setUploadingPhotos(true)
    try {
      for (const file of list) {
        const fd = new FormData()
        fd.append("file", file)
        const res = await fetch(`/api/orders/products/${editing.id}/photos`, {
          method: "POST",
          body: fd,
        })
        const json = (await res.json()) as {
          id?: string
          url?: string
          sortOrder?: number
          error?: string
        }
        if (!res.ok) {
          setPhotoError(json.error ?? "No se pudo subir la foto.")
          break
        }
        if (json.id && json.url) {
          setEditPhotos((prev) => [
            ...prev.filter((p) => p.id !== "cover"),
            {
              id: json.id!,
              url: json.url!,
              sortOrder: Number(json.sortOrder ?? prev.length),
            },
          ])
        }
      }
      setRetry((n) => n + 1)
    } catch {
      setPhotoError("No se pudo subir la foto.")
    } finally {
      setUploadingPhotos(false)
    }
  }

  async function deletePhoto(photoId: string) {
    if (!editing?.id) return
    setPhotoError("")
    try {
      if (photoId === "cover") {
        const res = await fetch(`/api/orders/products/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name.trim() || editing.name,
            priceCents: Number(draft.price.replace(/\D/g, "")) || editing.priceCents,
            description: draft.description,
            categoryId: draft.categoryId || null,
            photo: null,
          }),
        })
        const json = (await res.json()) as { error?: string }
        if (!res.ok) {
          setPhotoError(json.error ?? "No se pudo eliminar la foto.")
          return
        }
        setEditPhotos([])
        setRetry((n) => n + 1)
        return
      }
      const res = await fetch(
        `/api/orders/products/${editing.id}/photos/${photoId}`,
        { method: "DELETE" }
      )
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setPhotoError(json.error ?? "No se pudo eliminar la foto.")
        return
      }
      setEditPhotos((prev) => prev.filter((p) => p.id !== photoId))
      setRetry((n) => n + 1)
    } catch {
      setPhotoError("No se pudo eliminar la foto.")
    }
  }

  async function save() {
    setFormError("")
    const name = draft.name.trim()
    const priceCents = Number(draft.price.replace(/\D/g, ""))
    if (!name) {
      setFormError("Escribí el nombre del producto.")
      return
    }
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      setFormError("Escribí el precio (número entero).")
      return
    }
    setSaving(true)
    try {
      const payload = {
        name,
        priceCents,
        description: draft.description,
        categoryId: draft.categoryId || null,
      }
      const res = editing
        ? await fetch(`/api/orders/products/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/orders/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
      const json = (await res.json()) as { id?: string; error?: string }
      if (!res.ok) {
        setFormError(json.error ?? "No pudimos guardar.")
        return
      }
      const productId = editing?.id ?? json.id
      if (productId) {
        const vr = await fetch(`/api/orders/products/${productId}/variants`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groups: draft.groups }),
        })
        if (!vr.ok) {
          const vj = (await vr.json()) as { error?: string }
          setFormError(vj.error ?? "El producto se guardó, pero no las variantes.")
          return
        }
      }
      if (!editing && productId) {
        setEditing({
          id: productId,
          name,
          description: draft.description || null,
          photo: null,
          photos: [],
          categoryId: draft.categoryId || null,
          categoryName: null,
          priceCents,
          isAvailable: true,
          variantGroups: draft.groups,
        })
        setEditPhotos([])
        showToast("Producto creado. Ahora podés agregar fotos.")
        setLoading(true)
        setRetry((n) => n + 1)
        return
      }
      setFormOpen(false)
      setLoading(true)
      setRetry((n) => n + 1)
      showToast(editing ? "Producto actualizado." : "Producto creado.")
    } catch {
      setFormError("No pudimos guardar.")
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/orders/products/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        showToast("No se pudo eliminar.")
        return
      }
      showToast(`Eliminamos ${deleteTarget.name}.`)
      setDeleteTarget(null)
      setLoading(true)
      setRetry((n) => n + 1)
    } catch {
      showToast("No se pudo eliminar.")
    }
  }

  function addGroup() {
    setDraft((d) => ({
      ...d,
      groups: [
        ...d.groups,
        { name: "", selectionType: "single", isRequired: false, options: [{ name: "", priceDeltaCents: 0 }] },
      ],
    }))
  }

  function patchGroup(i: number, patch: Partial<VariantGroup>) {
    setDraft((d) => ({
      ...d,
      groups: d.groups.map((g, idx) => (idx === i ? { ...g, ...patch } : g)),
    }))
  }

  function addOption(gi: number) {
    setDraft((d) => ({
      ...d,
      groups: d.groups.map((g, idx) =>
        idx === gi ? { ...g, options: [...g.options, { name: "", priceDeltaCents: 0 }] } : g
      ),
    }))
  }

  function patchOption(gi: number, oi: number, patch: Partial<VariantOption>) {
    setDraft((d) => ({
      ...d,
      groups: d.groups.map((g, idx) =>
        idx === gi
          ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) }
          : g
      ),
    }))
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header className="flex flex-col">
        <button
          type="button"
          onClick={() => router.push(`/${slug}/dashboard/orders`)}
          className="min-h-[48px] text-left text-base font-semibold text-[var(--color-primary,#F97316)]"
        >
          ← Pedidos
        </button>
        <h1 className="text-[22px] font-bold tracking-tight text-stone-900">Productos</h1>
      </header>

      <button
        type="button"
        onClick={openNew}
        className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
      >
        Nuevo producto
      </button>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar producto"
        aria-label="Buscar producto"
        className="h-[52px] w-full rounded-[14px] border-0 bg-[#F5F5F4] px-4 text-base text-stone-900 outline-none placeholder:text-stone-500"
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
              setError("")
              setLoading(true)
              setRetry((n) => n + 1)
            }}
            className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 rounded-2xl border border-[#E7E5E4] bg-white px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F5F5F4]">
                  {p.photo || p.photos?.[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.photo ?? p.photos?.[0]?.url ?? ""}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-stone-900">{p.name}</p>
                  <p className="text-sm text-stone-600">
                    $ {formatCents(p.priceCents)}
                    {p.categoryName ? ` · ${p.categoryName}` : ""}
                  </p>
                </div>
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
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="min-h-[48px] flex-1 rounded-xl border border-[#E7E5E4] text-base font-semibold text-stone-800"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(p)}
                  className="min-h-[48px] flex-1 rounded-xl text-base font-semibold text-red-600"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            <DialogDescription>Nombre, precio y variantes. Los precios van en centavos enteros.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-base font-semibold">Nombre</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className="min-h-[52px] rounded-2xl border border-[#E7E5E4] px-4 text-base"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-base font-semibold">Precio (centavos)</span>
              <input
                inputMode="numeric"
                value={draft.price}
                onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                className="min-h-[52px] rounded-2xl border border-[#E7E5E4] px-4 text-base"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-base font-semibold">Descripción (opcional)</span>
              <input
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                className="min-h-[52px] rounded-2xl border border-[#E7E5E4] px-4 text-base"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-base font-semibold">Categoría</span>
              <select
                value={draft.categoryId}
                onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value }))}
                className="min-h-[52px] rounded-2xl border border-[#E7E5E4] px-4 text-base"
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold">Fotos</p>
              {!editing?.id ? (
                <p className="text-sm text-stone-600">
                  Guardá el producto primero para poder subir fotos.
                </p>
              ) : (
                <>
                  <p className="text-sm text-stone-600">Podés subir hasta 8 fotos.</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {editPhotos.map((ph, i) => (
                      <div
                        key={ph.id}
                        className="relative overflow-hidden rounded-xl border border-[#E7E5E4] bg-[#F5F5F4]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ph.url}
                          alt=""
                          className="aspect-square w-full object-cover"
                        />
                        {i === 0 ? (
                          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
                            Principal
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void deletePhoto(ph.id)}
                          className="absolute bottom-2 right-2 min-h-[48px] min-w-[48px] rounded-xl bg-white/95 px-2 text-sm font-semibold text-red-600 shadow"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="flex min-h-[56px] cursor-pointer items-center justify-center rounded-2xl border border-dashed border-[#E7E5E4] px-4 text-base font-semibold text-[var(--color-primary,#F97316)]">
                    {uploadingPhotos ? "Subiendo…" : "Agregar fotos"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={uploadingPhotos || editPhotos.length >= MAX_PHOTOS}
                      className="sr-only"
                      onChange={(e) => {
                        void uploadPhotos(e.target.files)
                        e.target.value = ""
                      }}
                    />
                  </label>
                  {photoError ? (
                    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                      {photoError}
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold">Variantes</p>
              {draft.groups.map((g, gi) => (
                <div key={gi} className="rounded-xl border border-[#E7E5E4] p-3">
                  <input
                    value={g.name}
                    placeholder="Nombre del grupo (ej. Tamaño)"
                    onChange={(e) => patchGroup(gi, { name: e.target.value })}
                    className="mb-2 min-h-[52px] w-full rounded-xl border border-[#E7E5E4] px-3 text-base"
                  />
                  {g.options.map((o, oi) => (
                    <div key={oi} className="mb-2 flex gap-2">
                      <input
                        value={o.name}
                        placeholder="Opción"
                        onChange={(e) => patchOption(gi, oi, { name: e.target.value })}
                        className="min-h-[48px] flex-1 rounded-xl border border-[#E7E5E4] px-3 text-base"
                      />
                      <input
                        inputMode="numeric"
                        value={String(o.priceDeltaCents)}
                        aria-label="priceDeltaCents"
                        onChange={(e) =>
                          patchOption(gi, oi, {
                            priceDeltaCents: Number(e.target.value.replace(/[^\d-]/g, "")) || 0,
                          })
                        }
                        className="min-h-[48px] w-24 rounded-xl border border-[#E7E5E4] px-3 text-base"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(gi)}
                    className="min-h-[48px] text-base font-semibold text-[var(--color-primary,#F97316)]"
                  >
                    + Opción
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addGroup}
                className="min-h-[48px] text-left text-base font-semibold text-[var(--color-primary,#F97316)]"
              >
                + Grupo de variantes
              </button>
            </div>

            {formError ? (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {formError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="min-h-[48px] rounded-xl border border-[#E7E5E4] px-4 text-base font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="min-h-[56px] rounded-xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              Se saca del menú. Los pedidos viejos siguen mostrando lo que se compró.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="min-h-[48px] rounded-xl border border-[#E7E5E4] px-4 text-base font-semibold"
            >
              No
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              className="min-h-[56px] rounded-xl bg-red-600 px-4 text-base font-bold text-white"
            >
              Sí, eliminar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast ? (
        <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {toast}
        </p>
      ) : null}
    </div>
  )
}
