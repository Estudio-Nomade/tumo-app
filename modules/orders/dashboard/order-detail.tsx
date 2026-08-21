"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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

type OrderVariant = { groupName: string; optionName: string; priceDeltaCents: number }

type OrderDetail = {
  id: string
  orderNumber: number
  status: string
  paymentMethod: "transfer" | "mercadopago" | "at_pickup"
  paymentStatus: string
  fulfillment: string
  deliveryAddress: string | null
  deliveryFeeCents: number
  subtotalCents: number
  totalCents: number
  notes: string | null
  customer: { id: string; name: string; phone: string; code: string }
  items: { productName: string; quantity: number; unitPriceCents: number; variants: OrderVariant[] }[]
  payment: { status: string; receiptMime: string | null; receiptBase64: string | null } | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Nuevo",
  confirmed: "Confirmado",
  preparing: "En preparación",
  ready: "Listo",
  completed: "Entregado",
  cancelled: "Cancelado",
}

const NEXT: Record<string, { label: string; to: string }> = {
  pending: { label: "Confirmar pedido", to: "confirmed" },
  confirmed: { label: "Empezar a preparar", to: "preparing" },
  preparing: { label: "Marcar listo", to: "ready" },
  ready: { label: "Marcar entregado", to: "completed" },
}

function paymentLabel(method: string, status: string): string {
  if (status === "paid") return "Pagado"
  if (status === "rejected") return "Pago rechazado"
  if (method === "transfer" && status === "pending_receipt") return "Falta comprobante"
  if (method === "transfer" && status === "pending_verification") return "Revisar comprobante"
  if (method === "mercadopago" && status === "pending") return "Pago en proceso"
  if (method === "at_pickup") return "Paga al retirar"
  return "Pagado"
}

export default function OrderDetail({
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
  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toast, setToast] = useState("")

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(""), 2500)
  }

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
        if (!cancelled) setError("No pudimos cargar el pedido.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orderId, reload])

  async function act(body: Record<string, unknown>, success: string) {
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(json.error ?? "No se pudo actualizar el pedido.")
        return
      }
      showToast(success)
      setReload((n) => n + 1)
    } catch {
      setError("No se pudo actualizar el pedido.")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-2">
        <div className="h-20 animate-pulse rounded-2xl bg-[#F5F5F4]" />
        <div className="h-40 animate-pulse rounded-2xl bg-[#F5F5F4]" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 p-4 py-12 text-center">
        <p className="text-base text-stone-600">{error || "No encontramos ese pedido."}</p>
        <button
          type="button"
          onClick={() => router.push(`/${slug}/dashboard/orders`)}
          className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
        >
          Volver a pedidos
        </button>
      </div>
    )
  }

  const ps = order.paymentStatus
  const pm = order.paymentMethod
  const isTransferReview = pm === "transfer" && ps === "pending_verification"
  const awaitingPayment =
    order.status === "pending" &&
    pm !== "at_pickup" &&
    ps !== "paid" &&
    !isTransferReview
  const next = NEXT[order.status]
  const canMarkPaid = pm === "at_pickup" && ps === "unpaid"

  const receiptSrc =
    order.payment?.receiptBase64
      ? `data:${order.payment.receiptMime ?? "image/jpeg"};base64,${order.payment.receiptBase64}`
      : null

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
            Pedido #{order.orderNumber}
          </h1>
        </div>
        <span className="rounded-full bg-[#FFF7ED] px-3 py-1.5 text-base font-bold text-[var(--color-primary,#F97316)]">
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </header>

      <section className="rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <p className="text-base font-semibold text-stone-900">{order.customer.name}</p>
        <p className="text-sm text-stone-600">{order.customer.phone}</p>
        <a
          href={`https://wa.me/${order.customer.phone}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-[48px] items-center rounded-xl border border-[var(--color-primary,#F97316)] px-4 text-base font-semibold text-[var(--color-primary,#F97316)]"
        >
          Escribirle por WhatsApp
        </a>
      </section>

      <section className="rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <ul className="flex flex-col gap-2">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between text-base">
              <span className="text-stone-900">
                {it.quantity}× {it.productName}
                {it.variants.length > 0 ? (
                  <span className="text-sm text-stone-600">
                    {" "}
                    ({it.variants.map((v) => v.optionName).join(", ")})
                  </span>
                ) : null}
              </span>
              <span className="text-stone-600">
                $ {formatCents(it.unitPriceCents * it.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-[#F5F5F4] pt-2 text-base font-bold text-stone-900">
          <span>TOTAL</span>
          <span>$ {formatCents(order.totalCents)}</span>
        </div>
      </section>

      {order.notes ? (
        <section className="rounded-2xl bg-amber-50 px-4 py-3 text-base text-amber-800">
          Ojo: {order.notes}
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <p className="text-base font-semibold text-stone-900">Pago</p>
        <p className="text-sm text-stone-600">{paymentLabel(pm, ps)}</p>

        {isTransferReview && receiptSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={receiptSrc}
            alt="Comprobante"
            className="mt-3 w-full rounded-xl border border-[#E7E5E4] object-contain"
          />
        ) : null}
      </section>

      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {isTransferReview ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void act({ action: "verify", decision: "approve" }, "Pago aprobado")}
            className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white disabled:opacity-60"
          >
            Aprobar pago y confirmar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void act({ action: "verify", decision: "reject" }, "Pago rechazado")}
            className="min-h-[56px] w-full rounded-2xl border border-[#E7E5E4] bg-white px-4 text-base font-bold text-red-600 disabled:opacity-60"
          >
            Rechazar
          </button>
        </div>
      ) : awaitingPayment ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-base text-amber-800">
          Esperando el pago del cliente.
        </p>
      ) : next ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void act({ action: "transition", newStatus: next.to }, `Pedido #${order.orderNumber} ${STATUS_LABEL[next.to]?.toLowerCase()}`)}
          className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white disabled:opacity-60"
        >
          {next.label}
        </button>
      ) : null}

      {canMarkPaid ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void act({ action: "verify", decision: "approve" }, "Marcado como cobrado")}
          className="min-h-[56px] w-full rounded-2xl border border-[var(--color-primary,#F97316)] bg-white px-4 text-base font-bold text-[var(--color-primary,#F97316)] disabled:opacity-60"
        >
          Marcar como cobrado
        </button>
      ) : null}

      <Link
        href={`/${slug}/dashboard/loyalty?highlight=${order.customer.id}`}
        className="inline-flex min-h-[48px] items-center justify-center rounded-xl text-base font-semibold text-[var(--color-primary,#F97316)]"
      >
        Sumar compra en Fidelización →
      </Link>

      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="min-h-[48px] text-center text-base font-semibold text-red-600"
      >
        Cancelar pedido
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cancelar el pedido #{order.orderNumber} de {order.customer.name}?</DialogTitle>
            <DialogDescription>
              Si ya pagó, devolvé la plata a mano.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="min-h-[48px] rounded-xl border border-[#E7E5E4] px-4 text-base font-semibold text-stone-700"
            >
              No
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDialogOpen(false)
                void act({ action: "cancel" }, `Pedido #${order.orderNumber} cancelado`)
              }}
              className="min-h-[48px] rounded-xl bg-red-600 px-4 text-base font-semibold text-white disabled:opacity-60"
            >
              Sí, cancelar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
