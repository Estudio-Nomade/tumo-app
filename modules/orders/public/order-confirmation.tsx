"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { formatCents, type PaymentStatus } from "@/modules/orders/lib/types"
import { createOrdersChannel, shouldTrackPayment } from "@/modules/orders/lib/realtime"

type OrderVariant = { groupName: string; optionName: string; priceDeltaCents: number }

type OrderDetail = {
  id: string
  orderNumber: number
  status: string
  paymentMethod: "transfer" | "at_pickup"
  paymentStatus: PaymentStatus
  fulfillment: string
  deliveryFeeCents: number
  subtotalCents: number
  totalCents: number
  customer: { id: string; name: string; phone: string; code: string }
  items: {
    productName: string
    quantity: number
    unitPriceCents: number
    variants: OrderVariant[]
  }[]
  transfer: { alias: string | null; cbu: string | null; holder: string | null } | null
}

export default function OrderConfirmation({
  slug,
  orderId,
}: {
  slug: string
  orderId: string
}) {
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)
  const [copied, setCopied] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [changing, setChanging] = useState(false)
  const busyRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/orders/${orderId}`)
      .then((res) => res.json())
      .then((json: OrderDetail & { error?: string }) => {
        if (cancelled) return
        if (json.error) {
          setError(json.error)
          setOrder(null)
          return
        }
        setOrder(json)
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar tu pedido.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orderId, reload])

  useEffect(() => {
    if (!order) return
    if (!shouldTrackPayment(order.paymentMethod, order.paymentStatus)) return
    const channel = createOrdersChannel({
      name: `order-${order.id}`,
      event: "UPDATE",
      filter: `id=eq.${order.id}`,
      onChange: () => setReload((n) => n + 1),
    })
    return () => channel.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, order?.paymentMethod, order?.paymentStatus])

  useEffect(() => {
    if (!order) return
    if (!shouldTrackPayment(order.paymentMethod, order.paymentStatus)) return
    const id = window.setInterval(() => setReload((n) => n + 1), 10000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.paymentMethod, order?.paymentStatus])

  async function copyField(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied(""), 2000)
    } catch {
      // ignore
    }
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  async function compressImage(file: File): Promise<{ mime: string; data: string }> {
    const isHeic = file.type === "image/heic" || file.type === "image/heif"
    const dataUrl = await readFileAsDataUrl(file)
    if (isHeic) {
      return { mime: file.type || "image/heic", data: dataUrl.split(",")[1] ?? "" }
    }
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error("no-image"))
      i.src = dataUrl
    })
    const max = 1600
    let { width, height } = img
    if (width > max || height > max) {
      const scale = max / Math.max(width, height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      return { mime: file.type, data: dataUrl.split(",")[1] ?? "" }
    }
    ctx.drawImage(img, 0, 0, width, height)
    const out = canvas.toDataURL("image/jpeg", 0.7)
    return { mime: "image/jpeg", data: out.split(",")[1] ?? "" }
  }

  async function sendReceipt() {
    if (!file || busyRef.current) return
    busyRef.current = true
    setUploading(true)
    setUploadError("")
    try {
      const { mime, data } = await compressImage(file)
      const res = await fetch(`/api/orders/${orderId}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mime, data }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setUploadError(json.error ?? "No pudimos subir el comprobante.")
        return
      }
      setFile(null)
      setReload((n) => n + 1)
    } catch {
      setUploadError("No pudimos subir el comprobante.")
    } finally {
      busyRef.current = false
      setUploading(false)
    }
  }

  async function changeMethod(method: "transfer" | "at_pickup") {
    if (busyRef.current) return
    busyRef.current = true
    setChanging(true)
    setError("")
    try {
      const res = await fetch(`/api/orders/${orderId}/payment-method`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: method }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(json.error ?? "No pudimos actualizar el método de pago.")
        return
      }
      setReload((n) => n + 1)
    } catch {
      setError("No pudimos actualizar el método de pago.")
    } finally {
      busyRef.current = false
      setChanging(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
        <p
          role="status"
          className="text-base text-[var(--color-muted-public,#78716C)]"
        >
          Cargando tu pedido…
        </p>
        <div className="h-40 animate-pulse rounded-2xl bg-[#F5F5F4]" />
        <div className="h-8 w-1/2 animate-pulse rounded bg-[#F5F5F4]" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 p-4 py-12 text-center">
        <p className="text-base text-[var(--color-muted-public,#78716C)]">
          {error || "No encontramos ese pedido"}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/${slug}/orders`)}
          className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
        >
          Volver al menú
        </button>
      </div>
    )
  }

  const ps = order.paymentStatus
  const pm = order.paymentMethod
  const paid = ps === "paid" || pm === "at_pickup"
  const reviewingReceipt = pm === "transfer" && ps === "pending_verification"
  const needsReceipt = pm === "transfer" && (ps === "pending_receipt" || ps === "rejected")

  const codeDigits = (order.customer.code || "····").slice(0, 4).split("")

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 pb-10">
      <header className="flex flex-col items-center gap-2 text-center">
        {paid ? <div className="text-[48px] leading-none text-green-600">✓</div> : null}
        <h1 className="text-[24px] font-bold text-[var(--color-ink-public,#1C1917)]">
          ¡Pedido recibido!
        </h1>
        <p className="text-base text-[var(--color-muted-public,#78716C)]">
          Pedido #{order.orderNumber} · Total $ {formatCents(order.totalCents)}
        </p>
      </header>

      {ps === "paid" ? (
        <div className="rounded-2xl bg-green-50 px-4 py-3 text-center text-base font-bold text-green-700">
          ✓ Pago confirmado
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <ul className="flex flex-col gap-1.5">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between text-base">
              <span className="text-[var(--color-ink-public,#1C1917)]">
                {it.quantity}× {it.productName}
              </span>
              <span className="text-[var(--color-muted-public,#78716C)]">
                $ {formatCents(it.unitPriceCents * it.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-[#F5F5F4] pt-2 text-base font-bold text-[var(--color-ink-public,#1C1917)]">
          <span>TOTAL</span>
          <span>$ {formatCents(order.totalCents)}</span>
        </div>
      </div>

      {needsReceipt ? (
        <div className="flex flex-col gap-4">
          {ps === "rejected" ? (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              El comprobante anterior fue rechazado. Subí otra foto.
            </p>
          ) : null}

          <div className="flex flex-col gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-4">
            <p className="text-base font-semibold text-[var(--color-ink-public,#1C1917)]">
              Ahora transferí
            </p>
            {order.transfer?.alias ? (
              <FieldRow
                label="Alias"
                value={order.transfer.alias}
                copied={copied === "alias"}
                onCopy={() => void copyField(order.transfer!.alias!, "alias")}
              />
            ) : null}
            {order.transfer?.cbu ? (
              <FieldRow
                label="CBU"
                value={order.transfer.cbu}
                copied={copied === "cbu"}
                onCopy={() => void copyField(order.transfer!.cbu!, "cbu")}
              />
            ) : null}
            {order.transfer?.holder ? (
              <p className="text-base text-[var(--color-muted-public,#78716C)]">
                Titular: {order.transfer.holder}
              </p>
            ) : null}
          </div>

          <label className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[#E7E5E4] bg-white p-4 text-center">
            <span className="text-2xl">📷</span>
            <span className="text-base font-semibold text-[var(--color-ink-public,#1C1917)]">
              Tocar para sacar o elegir una foto
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {file ? (
            <p className="text-sm text-[var(--color-muted-public,#78716C)]">
              Foto elegida: {file.name}
            </p>
          ) : null}

          {uploadError ? (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {uploadError}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!file || uploading || changing}
            onClick={() => void sendReceipt()}
            className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white disabled:opacity-50"
          >
            {uploading ? "Enviando…" : "Enviar comprobante"}
          </button>

          <button
            type="button"
            onClick={() => router.push(`/${slug}/orders`)}
            className="min-h-[48px] text-center text-sm font-semibold text-[var(--color-muted-public,#78716C)]"
          >
            Lo subo después
          </button>
        </div>
      ) : reviewingReceipt ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-base font-medium text-amber-800">
            Listo, Carri está revisando tu comprobante.
          </p>
          <button
            type="button"
            disabled={changing || uploading}
            onClick={() => void changeMethod("at_pickup")}
            className="min-h-[56px] w-full rounded-2xl border border-[#E7E5E4] bg-white px-4 text-base font-bold text-[var(--color-ink-public,#1C1917)] disabled:opacity-60"
          >
            Preferí pagar en efectivo
          </button>
        </div>
      ) : pm === "at_pickup" && ps === "unpaid" ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-base font-medium text-amber-800">
            Pagás en efectivo al retirar o cuando te lo llevan.
          </p>
          <button
            type="button"
            disabled={changing || uploading}
            onClick={() => void changeMethod("transfer")}
            className="min-h-[56px] w-full rounded-2xl border-2 border-[var(--color-primary,#F97316)] bg-white px-4 text-base font-bold text-[var(--color-primary,#F97316)] disabled:opacity-60"
          >
            Pagar por transferencia
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <p className="text-base font-semibold text-[var(--color-ink-public,#1C1917)]">
          ¿Qué sigue?
        </p>
        <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-base text-[var(--color-muted-public,#78716C)]">
          <li>Carri confirma tu pedido</li>
          <li>Lo prepara</li>
          {order.fulfillment === "delivery" ? (
            <li>Carri te escribe por WhatsApp para coordinar el envío</li>
          ) : (
            <li>Lo retirás mostrando el #{order.orderNumber}</li>
          )}
        </ol>
      </div>

      <div className="rounded-2xl bg-[#F5F5F4] p-4 text-center">
        <p className="text-base text-[var(--color-muted-public,#78716C)]">
          Tu código
        </p>
        <div className="mt-2 flex justify-center gap-2">
          {codeDigits.map((d, i) => (
            <span
              key={i}
              className="flex h-14 w-12 items-center justify-center rounded-xl bg-white text-[28px] font-bold text-[var(--color-ink-public,#1C1917)]"
            >
              {d}
            </span>
          ))}
        </div>
        <p className="mt-2 text-sm text-[var(--color-muted-public,#78716C)]">
          Mostralo al retirar y sumás tu compra
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => router.push(`/${slug}/orders`)}
        className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
      >
        Hacer otro pedido
      </button>
    </div>
  )
}

function FieldRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[var(--color-muted-public,#78716C)]">
          {label}
        </p>
        <p className="truncate text-base font-semibold text-[var(--color-ink-public,#1C1917)]">
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="min-h-[48px] shrink-0 rounded-xl bg-[#F5F5F4] px-3 text-sm font-semibold text-[var(--color-primary,#F97316)]"
      >
        {copied ? "¡Copiado!" : "Copiar"}
      </button>
    </div>
  )
}
