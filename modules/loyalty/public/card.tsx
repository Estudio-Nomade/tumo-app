"use client"

import { useCallback, useEffect, useState } from "react"
import QRCode from "qrcode"
import { useBusiness } from "@/shell/context/business"
import { customerLoyaltyQrPath } from "@/modules/loyalty/lib/parse-loyalty-qr"

export type LoyaltyCardData = {
  id: string
  name: string
  code: string
  points: number
  pointsNeeded: number
  rewardName: string
  canRedeem?: boolean
}

export default function LoyaltyCard({
  customer: initial,
  slug,
  onSwitchAccount,
}: {
  customer: LoyaltyCardData
  slug: string
  onSwitchAccount?: () => void
}) {
  const business = useBusiness()
  const [customer, setCustomer] = useState(initial)
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const path = customerLoyaltyQrPath(slug, customer.code)
    const absolute =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path
    void QRCode.toDataURL(absolute, {
      width: 200,
      margin: 2,
      color: { dark: "#1C1917", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    }).then((src) => {
      if (!cancelled) setQrDataUrl(src)
    })
    return () => {
      cancelled = true
    }
  }, [slug, customer.code])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const qs = new URLSearchParams({ id: customer.id, slug })
      const res = await fetch(`/api/loyalty/customers?${qs.toString()}`)
      if (!res.ok) return
      const data = (await res.json()) as LoyaltyCardData
      setCustomer((prev) => ({
        ...prev,
        ...data,
        canRedeem: Boolean(
          data.canRedeem ?? data.points >= data.pointsNeeded
        ),
      }))
    } catch {
      // keep last known state
    } finally {
      setRefreshing(false)
    }
  }, [customer.id, slug])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh()
    }, 8000)
    const onFocus = () => void refresh()
    window.addEventListener("focus", onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener("focus", onFocus)
    }
  }, [refresh])

  const needed = customer.pointsNeeded
  const current = Math.min(customer.points, needed)
  const remaining = Math.max(needed - customer.points, 0)
  const pct = needed > 0 ? Math.min((current / needed) * 100, 100) : 0
  const canRedeem = customer.canRedeem ?? customer.points >= needed
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
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: business.name,
          text: `Sumá en ${business.name}`,
          url,
        })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore cancel
    }
  }

  function switchAccount() {
    document.cookie = "client_id=; Max-Age=0; path=/"
    onSwitchAccount?.()
  }

  return (
    <div className="fixed inset-0 z-10 flex min-h-[100dvh] w-full flex-col items-center overflow-y-auto bg-[var(--color-surface-public,#FFFFFF)] pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1.5rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))]">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-5 py-3">
        <header className="flex items-center gap-3">
          <div
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary,#F97316)] text-[15px] font-bold text-white"
          >
            {initials || "·"}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[19px] font-bold tracking-tight text-[var(--color-ink-public,#1C1917)]">
              ¡Hola, {customer.name.split(/\s+/)[0] || customer.name}!
            </h1>
            <p className="truncate text-xs text-[var(--color-muted-public,#78716C)]">
              {business.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="shrink-0 text-xs font-semibold text-[var(--color-primary,#F97316)] disabled:opacity-50"
          >
            {refreshing ? "…" : "Actualizar"}
          </button>
        </header>

        <div className="flex w-full flex-col gap-3.5 rounded-3xl bg-gradient-to-b from-[var(--color-primary,#F97316)] to-[var(--color-card-to,color-mix(in_srgb,var(--color-primary,#F97316)_82%,#9a3412))] p-5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-[var(--color-reward-label,#FFEDD5)]">
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
              className="h-full rounded-full bg-[var(--color-progress-fill,var(--color-secondary,#FACC15))] transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[15px] font-semibold leading-snug">
            {canRedeem
              ? `¡Ya podés canjear tu ${customer.rewardName}!`
              : `¡Te faltan ${remaining} puntos para tu ${customer.rewardName}!`}
          </p>
          <span className="inline-flex w-fit rounded-full bg-black/15 px-3 py-2 text-xs font-semibold text-white">
            {customer.rewardName}
          </span>
        </div>

        <div className="flex w-full flex-col gap-4 rounded-3xl border border-[#E7E5E4] bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-[var(--color-muted-public,#78716C)]">
              Mostrá este QR o código al empleado
            </p>
          </div>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`QR de ${customer.name}`}
              className="mx-auto h-[200px] w-[200px] rounded-2xl"
            />
          ) : null}
          <div className="flex justify-center gap-2.5">
            {codeDigits.map((digit, i) => (
              <div
                key={`${digit}-${i}`}
                className="flex h-[68px] w-[60px] items-center justify-center rounded-[14px] bg-[#F5F5F4] text-[34px] font-extrabold text-[var(--color-ink-public,#1C1917)]"
              >
                {digit}
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void share()}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-share-bg,#FFF7ED)] px-3.5 py-2 text-xs font-semibold text-[var(--color-primary,#F97316)]"
            >
              {copied ? "¡Link copiado!" : "Compartir programa"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--color-hint-public,#A8A29E)]">
          Cada visita suma puntos. ¡A los {needed}, tu recompensa!
        </p>

        <button
          type="button"
          onClick={switchAccount}
          className="text-center text-xs font-semibold text-stone-400 underline-offset-2 hover:text-stone-600 hover:underline"
        >
          No soy {customer.name.split(/\s+/)[0] || customer.name}
        </button>
      </div>
    </div>
  )
}
