"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Sandwich } from "lucide-react"
import type { Business } from "@/lib/modules"
import {
  getLoyaltyDisplayUrl,
  getLoyaltyPublicUrl,
} from "@/lib/loyalty-url"

type Size = "sm" | "md" | "lg"

const SIZE_PX: Record<Size, number> = {
  sm: 140,
  md: 180,
  lg: 220,
}

export default function BrandedQr({
  business,
  origin,
  size = "md",
  footer,
}: {
  business: Pick<Business, "name" | "slug" | "logo" | "primary_color">
  origin: string
  size?: Size
  footer?: string
}) {
  const url = getLoyaltyPublicUrl(origin, business.slug)
  const display = getLoyaltyDisplayUrl(origin, business.slug)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState("")
  const qrPx = SIZE_PX[size]

  useEffect(() => {
    let cancelled = false
    setError("")
    void QRCode.toDataURL(url, {
      width: qrPx,
      margin: 2,
      color: {
        dark: "#1C1917",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    })
      .then((src) => {
        if (!cancelled) setDataUrl(src)
      })
      .catch(() => {
        if (!cancelled) {
          setDataUrl(null)
          setError("No se pudo generar el QR")
        }
      })
    return () => {
      cancelled = true
    }
  }, [url, qrPx])

  return (
    <div
      className="flex w-full max-w-[280px] flex-col overflow-hidden rounded-[20px] border border-[#E7E5E4] bg-white"
      data-testid="branded-qr"
    >
      <div
        className="flex items-center gap-2.5 px-3.5 py-3"
        style={{ backgroundColor: business.primary_color || "#F97316" }}
      >
        {business.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logo}
            alt=""
            className="h-8 w-8 rounded-[10px] object-cover bg-white"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white text-[var(--color-primary,#F97316)]">
            <Sandwich size={18} strokeWidth={2} aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold text-white">
            {business.name}
          </div>
          <div className="truncate text-[11px] text-[#FFEDD5]">Fidelización</div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center bg-white p-4">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`Código QR para ${display}`}
            width={qrPx}
            height={qrPx}
            className="h-auto w-full max-w-full"
          />
        ) : error ? (
          <p className="py-10 text-center text-sm text-red-600">{error}</p>
        ) : (
          <div
            className="animate-pulse rounded-lg bg-[#F5F5F4]"
            style={{ width: qrPx, height: qrPx }}
            aria-hidden
          />
        )}
      </div>

      <div className="bg-[#F5F5F4] px-3 py-2.5 text-center">
        <p className="text-[11px] font-semibold text-stone-500">
          {footer ?? "Sumá compras · ganá premios"}
        </p>
        <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--color-primary,#F97316)]">
          {display}
        </p>
      </div>
    </div>
  )
}
