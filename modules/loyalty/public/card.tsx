"use client"

import { useState } from "react"
import Button from "@/shell/ui/Button"

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
  const [copied, setCopied] = useState(false)
  const needed = customer.purchasesNeeded
  const current = Math.min(customer.purchases, needed)
  const remaining = Math.max(needed - customer.purchases, 0)
  const pct = needed > 0 ? Math.min((current / needed) * 100, 100) : 0
  const canRedeem = customer.canRedeem ?? customer.purchases >= needed

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
    <div className="mx-auto flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-gray-900">
        ¡Hola {customer.name}!
      </h1>

      <div>
        <div className="mb-2 flex justify-between text-sm text-gray-600">
          <span>
            {current} / {needed}
          </span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: "var(--color-primary, #F97316)",
            }}
          />
        </div>
        <p className="mt-3 text-sm text-gray-700">
          {canRedeem
            ? `¡Ya podés canjear tu ${customer.rewardName}!`
            : `¡Te faltan ${remaining} para tu ${customer.rewardName}!`}
        </p>
      </div>

      <div className="rounded-xl bg-gray-50 py-4 text-center">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Tu código
        </p>
        <p className="mt-1 text-4xl font-extrabold tracking-widest text-gray-900">
          {customer.code}
        </p>
      </div>

      <Button type="button" variant="outline" onClick={() => void share()}>
        {copied ? "¡Link copiado!" : "Compartir"}
      </Button>
    </div>
  )
}
