"use client"

import { useMemo, useRef, useState } from "react"
import { Gift } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import type { PointRange } from "@/modules/loyalty/lib/types"
import { rangeLabel } from "@/modules/loyalty/lib/types"

export type SheetCustomer = {
  id: string
  name: string
  phone: string
  code: string
  points: number
  pointsNeeded: number
  rewardName: string
  canRedeem: boolean
  pointRanges?: PointRange[]
}

type Step = "home" | "ranges" | "confirm" | "dupe"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: SheetCustomer | null
  ranges: PointRange[]
  onEarned: (customer: SheetCustomer) => void
  onRedeemed: (customerId: string) => void
  onToast: (msg: string) => void
}

export default function CustomerActionSheet({
  open,
  onOpenChange,
  customer,
  ranges,
  onEarned,
  onRedeemed,
  onToast,
}: Props) {
  const [step, setStep] = useState<Step>("home")
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const lockUntil = useRef(0)

  const earningBands = useMemo(
    () =>
      ranges
        .map((band, index) => ({ band, index }))
        .filter(({ band }) => band.points > 0),
    [ranges]
  )

  function reset() {
    setStep("home")
    setSelectedIndex(null)
    setBusy(false)
    setError("")
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function postPoints(force: boolean) {
    if (!customer || selectedIndex == null) return
    if (Date.now() < lockUntil.current) return
    const band = ranges[selectedIndex]
    if (!band || band.points <= 0) return

    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/loyalty/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          rangeIndex: selectedIndex,
          expectedPoints: band.points,
          force,
        }),
      })
      const data = (await res.json()) as SheetCustomer & {
        error?: string
        code?: string
        added?: number
      }
      if (res.status === 409 && data.code === "DUPLICATE_RECENT") {
        setStep("dupe")
        return
      }
      if (res.status === 409 && data.code === "RANGE_CHANGED") {
        setError(data.error ?? "Los rangos cambiaron. Elegí de nuevo.")
        setStep("ranges")
        return
      }
      if (!res.ok) {
        setError(data.error ?? "No se pudieron sumar puntos.")
        return
      }
      lockUntil.current = Date.now() + 2000
      onEarned({
        ...customer,
        ...data,
        canRedeem: Boolean(
          data.canRedeem ?? data.points >= data.pointsNeeded
        ),
      })
      onToast(`+${data.added ?? band.points} puntos a ${customer.name}`)
      handleOpenChange(false)
    } catch {
      setError("No se pudieron sumar puntos.")
    } finally {
      setBusy(false)
    }
  }

  async function redeem() {
    if (!customer) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/loyalty/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "No se pudo canjear.")
        return
      }
      onRedeemed(customer.id)
      onToast(`¡${customer.rewardName} canjeado!`)
      handleOpenChange(false)
    } catch {
      setError("No se pudo canjear.")
    } finally {
      setBusy(false)
    }
  }

  const selected = selectedIndex != null ? ranges[selectedIndex] : null

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] gap-4 rounded-t-3xl px-4 pb-8 pt-4"
      >
        {customer ? (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="text-2xl font-bold text-stone-900">
                ¡Hola {customer.name.split(/\s+/)[0]}!
              </SheetTitle>
              <SheetDescription className="text-base text-stone-600">
                {customer.points}/{customer.pointsNeeded} puntos
                {customer.rewardName ? ` · ${customer.rewardName}` : ""}
              </SheetDescription>
            </SheetHeader>

            {customer.canRedeem && step === "home" ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-[#EAB308]/40 bg-[#FEF9C3] p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                  <Gift className="h-4 w-4 text-[#CA8A04]" aria-hidden />
                  ¡Puede canjear {customer.rewardName}!
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void redeem()}
                  className="min-h-[48px] rounded-2xl bg-[#EAB308] px-4 text-base font-bold text-white disabled:opacity-60"
                >
                  Canjear premio
                </button>
              </div>
            ) : null}

            {step === "home" ? (
              <button
                type="button"
                disabled={busy || earningBands.length === 0}
                onClick={() => setStep("ranges")}
                className="min-h-[56px] w-full rounded-2xl bg-[#16A34A] text-lg font-bold text-white disabled:opacity-50"
              >
                SUMAR PUNTOS
              </button>
            ) : null}

            {step === "ranges" ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-stone-700">
                  Elegí el tramo de la compra
                </p>
                {earningBands.map(({ band, index }) => (
                  <button
                    key={index}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setSelectedIndex(index)
                      setStep("confirm")
                    }}
                    className="flex min-h-[52px] items-center justify-between rounded-2xl border border-[#E7E5E4] bg-white px-4 text-left"
                  >
                    <span className="text-sm text-stone-600">
                      ${rangeLabel(band)}
                    </span>
                    <span className="text-lg font-bold text-[#16A34A]">
                      +{band.points} pts
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  className="text-sm font-semibold text-stone-500"
                  onClick={() => setStep("home")}
                >
                  Volver
                </button>
              </div>
            ) : null}

            {step === "confirm" && selected ? (
              <div className="flex flex-col gap-3">
                <p className="text-center text-lg font-semibold text-stone-900">
                  {selected.points} puntos a {customer.name}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void postPoints(false)}
                  className="min-h-[56px] w-full rounded-2xl bg-[#16A34A] text-lg font-bold text-white disabled:opacity-60"
                >
                  {busy ? "…" : "Confirmar"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep("ranges")}
                  className="min-h-[44px] text-sm font-semibold text-stone-500"
                >
                  Cancelar
                </button>
              </div>
            ) : null}

            {step === "dupe" && selected ? (
              <div className="flex flex-col gap-3">
                <p className="text-center text-base text-stone-800">
                  Ya sumaste puntos a {customer.name} hace menos de un minuto.
                  ¿Confirmás de nuevo?
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void postPoints(true)}
                  className="min-h-[56px] w-full rounded-2xl bg-[#16A34A] text-lg font-bold text-white"
                >
                  Sí, sumar otra vez
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="min-h-[44px] text-sm font-semibold text-stone-500"
                >
                  Cancelar
                </button>
              </div>
            ) : null}

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
