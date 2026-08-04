"use client"

import { useState } from "react"
import Button from "@/shell/ui/Button"
import { useBusiness } from "@/shell/context/business"

export type LoyaltyCardData = {
  id: string
  name: string
  code: string
  purchases: number
  purchasesNeeded: number
  rewardName: string
  canRedeem?: boolean
}

const shellClassName =
  "fixed inset-0 z-10 flex min-h-[100dvh] w-full flex-col items-center overflow-y-auto bg-gradient-to-b from-[color-mix(in_srgb,var(--color-primary,#F97316)_55%,white)] via-[var(--color-primary,#F97316)] to-[color-mix(in_srgb,var(--color-primary,#F97316)_65%,black)] pt-[max(1.5rem,env(safe-area-inset-top))] pr-[max(1.5rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))]"

export default function LoyaltyCard({
  customer,
  slug,
}: {
  customer: LoyaltyCardData
  slug: string
}) {
  const business = useBusiness()
  const [copied, setCopied] = useState(false)
  const needed = customer.purchasesNeeded
  const current = Math.min(customer.purchases, needed)
  const remaining = Math.max(needed - customer.purchases, 0)
  const pct = needed > 0 ? Math.min((current / needed) * 100, 100) : 0
  const canRedeem = customer.canRedeem ?? customer.purchases >= needed
  const initials = customer.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

  async function share() {
    const url = `${window.location.origin}/${slug}/loyalty`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className={shellClassName}>
      <div className="mx-auto flex w-full max-w-sm flex-col gap-5 py-8">
        <header className="flex items-center gap-3 text-white">
          {business.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logo}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold backdrop-blur-sm"
            >
              {initials || "·"}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">
              ¡Hola {customer.name}!
            </h1>
            <p className="truncate text-xs text-white/80">{business.name}</p>
          </div>
        </header>

        <div className="flex w-full flex-col gap-5 rounded-3xl border border-white/25 bg-white/95 p-6 shadow-xl backdrop-blur-sm">
          <div className="rounded-3xl bg-gradient-to-b from-[var(--color-primary,#F97316)] to-[color-mix(in_srgb,var(--color-primary,#F97316)_70%,black)] p-5 text-white shadow-md">
            <p className="text-[13px] font-medium text-white/85">
              Tu próxima recompensa
            </p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight">
              {current} de {needed}
            </p>
            <div className="mt-3 h-3.5 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-[var(--color-secondary,#FACC15)] transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-4 text-[15px] font-semibold leading-snug">
              {canRedeem
                ? `¡Ya podés canjear tu ${customer.rewardName}!`
                : `¡Te faltan ${remaining} para tu ${customer.rewardName}!`}
            </p>
            <span className="mt-3 inline-flex rounded-full bg-black/15 px-3 py-1.5 text-xs font-semibold text-white">
              {customer.rewardName}
            </span>
          </div>

          <div className="rounded-2xl bg-stone-100 px-4 py-5 text-center">
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">
              Tu código
            </p>
            <p className="mt-2 text-4xl font-extrabold tracking-widest text-stone-900">
              {customer.code}
            </p>
            <p className="mt-2 text-xs text-stone-500">
              Mostrá este código al empleado
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void share()}
            className="h-12 w-full !rounded-2xl text-sm font-bold"
          >
            {copied ? "¡Link copiado!" : "Compartir"}
          </Button>
        </div>

        <p className="text-center text-xs text-white/80">
          Cada compra suma. ¡A las {needed}, tu recompensa!
        </p>
      </div>
    </div>
  )
}
