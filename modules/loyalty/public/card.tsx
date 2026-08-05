"use client"

import { useState } from "react"
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
  const codeDigits = customer.code.padEnd(4, "·").slice(0, 4).split("")

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
    <div className="fixed inset-0 z-10 flex min-h-[100dvh] w-full flex-col items-center overflow-y-auto bg-white pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1.5rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))]">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-5 py-3">
        <header className="flex items-center gap-3">
          <div
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary,#F97316)] text-[15px] font-bold text-white"
          >
            {initials || "·"}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[19px] font-bold tracking-tight text-stone-900">
              ¡Hola, {customer.name.split(/\s+/)[0] || customer.name}!
            </h1>
            <p className="truncate text-xs text-stone-500">{business.name}</p>
          </div>
        </header>

        <div className="flex w-full flex-col gap-3.5 rounded-3xl bg-gradient-to-b from-[var(--color-primary,#F97316)] to-[color-mix(in_srgb,var(--color-primary,#F97316)_82%,#9a3412)] p-5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-[#FFEDD5]">
              Tu próxima recompensa
            </p>
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--color-primary,#F97316)]"
            >
              ★
            </span>
          </div>
          <p className="text-[32px] font-extrabold leading-none tracking-tight">
            {current} de {needed}
          </p>
          <div className="h-3.5 w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-[var(--color-secondary,#FACC15)] transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[15px] font-semibold leading-snug">
            {canRedeem
              ? `¡Ya podés canjear tu ${customer.rewardName}!`
              : `¡Te faltan ${remaining} compras para tu ${customer.rewardName}!`}
          </p>
          <span className="inline-flex w-fit rounded-full bg-black/15 px-3 py-2 text-xs font-semibold text-white">
            {customer.rewardName}
          </span>
        </div>

        <div className="flex w-full flex-col gap-4 rounded-3xl border border-[#E7E5E4] bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-stone-500">
              Mostrá este código al empleado
            </p>
          </div>
          <div className="flex justify-center gap-2.5">
            {codeDigits.map((digit, i) => (
              <div
                key={`${digit}-${i}`}
                className="flex h-[68px] w-[60px] items-center justify-center rounded-[14px] bg-[#F5F5F4] text-[34px] font-extrabold text-stone-900"
              >
                {digit}
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void share()}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF7ED] px-3.5 py-2 text-xs font-semibold text-[var(--color-primary,#F97316)]"
            >
              {copied ? "¡Link copiado!" : "Compartir"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-[#A8A29E]">
          Cada compra suma. ¡A las {needed}, tu recompensa!
        </p>
      </div>
    </div>
  )
}
