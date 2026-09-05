"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useBusiness } from "@/shell/context/business"
import {
  cartSummary,
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
import { formatCents } from "@/modules/orders/lib/types"
import OrdersPublicNav, {
  notifyOrdersCartChanged,
} from "@/modules/orders/public/orders-public-nav"
import AddressAutocomplete from "@/modules/orders/public/address-autocomplete"

type Step = 1 | 2 | 3
type Fulfillment = "pickup" | "delivery"
type PaymentMethod = "transfer" | "mercadopago" | "at_pickup"

const STEPS = [
  { n: 1, title: "Tu pedido" },
  { n: 2, title: "¿Cómo lo recibís?" },
  { n: 3, title: "Pago y tus datos" },
]

export default function CartWizard({ slug }: { slug: string }) {
  const business = useBusiness()
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [cart, setCart] = useState<CartItem[]>(() => loadCart(slug))
  const [fulfillment, setFulfillment] = useState<Fulfillment>("pickup")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [name, setName] = useState(() => loadLastGuest(slug)?.name ?? "")
  const [phone, setPhone] = useState(() => loadLastGuest(slug)?.phone ?? "")
  const guestPrefill = Boolean(loadLastGuest(slug))
  const [notes, setNotes] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("at_pickup")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [undoItem, setUndoItem] = useState<{ item: CartItem; index: number } | null>(null)
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [deliveryFeeCents, setDeliveryFeeCents] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/orders/catalog?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((json: { settings?: { deliveryFeeCents?: number } }) => {
        if (!cancelled) setDeliveryFeeCents(json.settings?.deliveryFeeCents ?? 0)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [slug])

  const summary = cartSummary(cart)
  const fee = fulfillment === "delivery" ? deliveryFeeCents : 0
  const totalCents = summary.subtotalCents + fee

  const stepLabel = STEPS.find((s) => s.n === step)!

  function updateCart(next: CartItem[]) {
    setCart(next)
    saveCart(slug, next)
    notifyOrdersCartChanged()
  }

  function handleRemove(item: CartItem, index: number) {
    setUndoItem({ item, index })
    updateCart(removeItem(cart, item.key))
    window.setTimeout(() => setUndoItem(null), 3000)
  }

  function undoRemove() {
    if (!undoItem) return
    const next = [...cart]
    next.splice(Math.min(undoItem.index, next.length), 0, undoItem.item)
    updateCart(next)
    setUndoItem(null)
  }

  function goNext() {
    setError("")
    if (step === 1) {
      if (cart.length === 0) {
        setError("Tu pedido está vacío.")
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (fulfillment === "delivery" && !deliveryAddress.trim()) {
        setError("Escribí la dirección.")
        return
      }
      setStep(3)
    }
  }

  async function confirm() {
    setError("")
    if (!name.trim()) {
      setError("Escribí tu nombre.")
      return
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Escribí un WhatsApp válido.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          idempotencyKey,
          name,
          phone,
          notes,
          fulfillment,
          deliveryAddress: fulfillment === "delivery" ? deliveryAddress : undefined,
          paymentMethod,
          items: cart.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            variantOptionIds: it.variants.map((v) => v.optionId),
            notes: it.notes,
          })),
        }),
      })
      const data = (await res.json()) as { id?: string; error?: string }
      if (!res.ok) {
        setError(data.error ?? "No pudimos confirmar el pedido.")
        return
      }
      if (data.id) {
        saveLastGuest(slug, { name: name.trim(), phone })
        clearCart(slug)
        setCart([])
        notifyOrdersCartChanged()
        router.push(`/${slug}/orders/${data.id}`)
      }
    } catch {
      setError("No pudimos confirmar el pedido. Probá de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  function renderItem(it: CartItem, index: number) {
    const unit = itemUnitPriceCents(it)
    return (
      <li key={it.key} className="rounded-2xl border border-[#E7E5E4] bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-[var(--color-ink-public,#1C1917)]">
              {it.name}
            </p>
            {it.variants.length > 0 ? (
              <p className="text-sm text-[var(--color-muted-public,#78716C)]">
                {it.variants.map((v) => v.optionName).join(", ")}
              </p>
            ) : null}
            {it.notes ? (
              <p className="text-sm text-[var(--color-muted-public,#78716C)]">
                nota: {it.notes}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Menos"
              onClick={() => updateCart(setQuantity(cart, it.key, it.quantity - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#E7E5E4] text-xl font-bold"
            >
              −
            </button>
            <span className="w-7 text-center text-base font-bold">{it.quantity}</span>
            <button
              type="button"
              aria-label="Más"
              onClick={() => updateCart(setQuantity(cart, it.key, it.quantity + 1))}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#E7E5E4] text-xl font-bold"
            >
              +
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleRemove(it, index)}
            className="min-h-[48px] px-2 text-sm font-semibold text-red-600"
          >
            Quitar
          </button>
          <span className="text-base font-bold text-[var(--color-ink-public,#1C1917)]">
            $ {formatCents(unit * it.quantity)}
          </span>
        </div>
      </li>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col pb-36">
      <header className="px-4 pt-3 pb-2">
        <button
          type="button"
          onClick={() => {
            if (step === 1) router.push(`/${slug}/orders`)
            else setStep((s) => (s === 3 ? 2 : 1))
          }}
          className="min-h-[48px] text-left text-base font-semibold text-[var(--color-primary,#F97316)]"
        >
          {step === 1 ? "← Menú" : "← Atrás"}
        </button>
        <p className="text-sm font-semibold text-[var(--color-primary,#F97316)]">
          Paso {stepLabel.n} de 3
        </p>
        <h1 className="text-[22px] font-bold text-[var(--color-ink-public,#1C1917)]">
          {stepLabel.title}
        </h1>
      </header>

      <div className="flex flex-col gap-4 px-4">
        {step === 1 ? (
          <>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <p className="text-base text-[var(--color-muted-public,#78716C)]">
                  Todavía no agregaste nada. Volvé al menú.
                </p>
                <button
                  type="button"
                  onClick={() => router.push(`/${slug}/orders`)}
                  className="min-h-[56px] w-full rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
                >
                  Ver el menú
                </button>
              </div>
            ) : (
              <>
                <ul className="flex flex-col gap-3">
                  {cart.map((it, i) => renderItem(it, i))}
                </ul>
                <div className="flex justify-between text-base font-semibold text-[var(--color-ink-public,#1C1917)]">
                  <span>Subtotal</span>
                  <span>$ {formatCents(summary.subtotalCents)}</span>
                </div>
              </>
            )}
          </>
        ) : step === 2 ? (
          <>
            <label className="flex min-h-[100px] cursor-pointer items-center gap-3 rounded-2xl border-2 border-[var(--color-primary,#F97316)] bg-white p-4">
              <input
                type="radio"
                name="fulfillment"
                checked={fulfillment === "pickup"}
                onChange={() => setFulfillment("pickup")}
                className="h-5 w-5 accent-[var(--color-primary,#F97316)]"
              />
              <span className="flex flex-col">
                <span className="text-base font-bold text-[var(--color-ink-public,#1C1917)]">
                  Lo retiro en el food truck
                </span>
                <span className="text-sm text-[var(--color-muted-public,#78716C)]">
                  {business.name}
                </span>
              </span>
            </label>

            <label className={`flex min-h-[100px] cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 ${fulfillment === "delivery" ? "border-[var(--color-primary,#F97316)] bg-white" : "border-[#E7E5E4] bg-white"}`}>
              <input
                type="radio"
                name="fulfillment"
                checked={fulfillment === "delivery"}
                onChange={() => setFulfillment("delivery")}
                className="h-5 w-5 accent-[var(--color-primary,#F97316)]"
              />
              <span className="flex flex-col">
                <span className="text-base font-bold text-[var(--color-ink-public,#1C1917)]">
                  Me lo envían
                </span>
                <span className="text-sm text-[var(--color-muted-public,#78716C)]">
                  Costo de envío: $ {formatCents(fee)}
                </span>
              </span>
            </label>

            {fulfillment === "delivery" ? (
              <div className="flex flex-col gap-1.5 overflow-visible">
                <span className="text-base font-semibold text-[var(--color-ink-public,#1C1917)]">
                  ¿A dónde lo mandamos?
                </span>
                <AddressAutocomplete
                  slug={slug}
                  value={deliveryAddress}
                  onChange={setDeliveryAddress}
                  placeholder="Calle y número, barrio"
                />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-base font-semibold text-[var(--color-ink-public,#1C1917)]">
                Tu nombre
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="María García"
                className="min-h-[52px] rounded-2xl border border-[#E7E5E4] px-4 text-base outline-none focus:border-[var(--color-primary,#F97316)]"
              />
            </label>

            {guestPrefill ? (
              <p className="text-sm text-[var(--color-muted-public,#78716C)]">
                Completamos tu nombre y WhatsApp del pedido anterior. Cambialos si hace falta.
              </p>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="text-base font-semibold text-[var(--color-ink-public,#1C1917)]">
                Tu WhatsApp
              </span>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 9 11 ..."
                className="min-h-[52px] rounded-2xl border border-[#E7E5E4] px-4 text-base outline-none focus:border-[var(--color-primary,#F97316)]"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-base font-semibold text-[var(--color-ink-public,#1C1917)]">
                ¿Algo que Carri tenga que saber? (opcional)
              </span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[52px] rounded-2xl border border-[#E7E5E4] px-4 text-base outline-none focus:border-[var(--color-primary,#F97316)]"
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-base font-semibold text-[var(--color-ink-public,#1C1917)]">
                ¿Cómo pagás?
              </span>
              {(
                [
                  ["transfer", "Transferencia", "Pasás la plata y subís la foto del comprobante"],
                  ["mercadopago", "MercadoPago", "Tarjeta, dinero en cuenta o efectivo"],
                  ["at_pickup", "Pagás al retirar", "Efectivo u otro medio en el food truck"],
                ] as [PaymentMethod, string, string][]
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 ${paymentMethod === value ? "border-[var(--color-primary,#F97316)] bg-white" : "border-[#E7E5E4] bg-white"}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === value}
                    onChange={() => setPaymentMethod(value)}
                    className="h-5 w-5 accent-[var(--color-primary,#F97316)]"
                  />
                  <span className="flex flex-col">
                    <span className="text-base font-bold text-[var(--color-ink-public,#1C1917)]">
                      {label}
                    </span>
                    <span className="text-sm text-[var(--color-muted-public,#78716C)]">
                      {hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <div className="flex flex-col gap-1 rounded-2xl bg-[#F5F5F4] p-4 text-base">
              <div className="flex justify-between">
                <span>{summary.count} ítems</span>
                <span>$ {formatCents(summary.subtotalCents)}</span>
              </div>
              {fee > 0 ? (
                <div className="flex justify-between">
                  <span>Envío</span>
                  <span>$ {formatCents(fee)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-[22px] font-bold">
                <span>TOTAL</span>
                <span>$ {formatCents(totalCents)}</span>
              </div>
            </div>
          </>
        )}

        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
      </div>

      {undoItem ? (
        <div className="fixed bottom-36 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white">
          <span>Quitado</span>
          <button type="button" onClick={undoRemove} className="text-[var(--color-secondary,#FACC15)]">
            Deshacer
          </button>
        </div>
      ) : null}

      {step === 1 && cart.length === 0 ? null : step < 3 ? (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 px-4 pb-2">
          <button
            type="button"
            onClick={goNext}
            className="min-h-[56px] w-full max-w-md mx-auto block rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white"
          >
            Continuar →
          </button>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 px-4 pb-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void confirm()}
            className="min-h-[56px] w-full max-w-md mx-auto block rounded-2xl bg-[var(--color-primary,#F97316)] px-4 text-base font-bold text-white disabled:opacity-60"
          >
            {submitting ? "Confirmando…" : `Confirmar pedido · $ ${formatCents(totalCents)}`}
          </button>
        </div>
      )}

      <OrdersPublicNav slug={slug} count={summary.count} />
    </div>
  )
}
