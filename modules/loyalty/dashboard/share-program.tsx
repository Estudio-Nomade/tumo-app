"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import {
  Check,
  Copy,
  Download,
  Lightbulb,
  Link2,
  MessageCircle,
  Share2,
  Smartphone,
} from "lucide-react"
import type { Business } from "@/lib/modules"
import { downloadQrImage } from "@/lib/download-qr"
import {
  getLoyaltyDisplayUrl,
  getLoyaltyPublicUrl,
} from "@/lib/loyalty-url"
import BrandedQr from "@/shell/ui/branded-qr"

function subscribeNoop() {
  return () => {}
}

function useOrigin() {
  return useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => ""
  )
}

export default function ShareProgram({
  business,
  variant = "card",
}: {
  business: Business
  variant?: "card" | "owner" | "counter"
}) {
  const origin = useOrigin()
  const [toast, setToast] = useState("")
  const [copied, setCopied] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const url = useMemo(
    () => (origin ? getLoyaltyPublicUrl(origin, business.slug) : ""),
    [origin, business.slug]
  )
  const display = useMemo(
    () => (origin ? getLoyaltyDisplayUrl(origin, business.slug) : ""),
    [origin, business.slug]
  )

  const shareTitle = `${business.name} · Fidelización`
  const shareText = url
    ? `Registrate en ${business.name} y sumá compras: ${url}`
    : ""

  function flash(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(""), 2200)
  }

  async function copyLink() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => {
        setCopied(false)
        setToast("")
      }, 2200)
    } catch {
      flash("No se pudo copiar")
    }
  }

  function openWhatsApp() {
    if (!url) return
    const href = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(href, "_blank", "noopener,noreferrer")
  }

  async function downloadQr() {
    if (!url) return
    try {
      const name = await downloadQrImage(business, origin)
      if (name) flash("QR descargado")
    } catch {
      flash("No se pudo descargar")
    }
  }

  async function shareNative() {
    if (!url) return
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: shareTitle, text: shareText, url })
        return
      }
      await navigator.clipboard.writeText(url)
      flash("Link copiado")
    } catch {
      // user cancelled — ignore
    }
  }

  if (variant === "counter") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
        <p className="text-center text-[13px] leading-relaxed text-stone-500">
          Mostrale esta pantalla al cliente para que se registre o abra su
          tarjeta.
        </p>
        {origin ? (
          <BrandedQr business={business} origin={origin} size="lg" />
        ) : (
          <div className="h-[320px] w-full max-w-[280px] animate-pulse rounded-[20px] bg-[#F5F5F4]" />
        )}
        <button
          type="button"
          onClick={() => void copyLink()}
          disabled={!url}
          className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#F5F5F4] text-[13px] font-semibold text-stone-900 disabled:opacity-50"
        >
          <Copy
            size={18}
            strokeWidth={2}
            className="text-[var(--color-primary,#F97316)]"
            aria-hidden
          />
          Copiar {display || "link"}
        </button>
        {toast ? (
          <p role="status" className="text-sm font-semibold text-green-700">
            {toast}
          </p>
        ) : null}
        <p className="flex items-center justify-center gap-2 text-[11px] text-stone-400">
          <Smartphone size={16} strokeWidth={2} aria-hidden />
          Brillo al máximo recomendado
        </p>
      </div>
    )
  }

  const tip =
    "Imprimí el QR o mostralo en el mostrador. El empleado también puede abrirlo desde el Panel."
  const showExtras = variant === "owner"

  return (
    <div
      className={
        showExtras
          ? "mx-auto flex w-full max-w-md flex-col gap-[18px]"
          : "flex w-full flex-col gap-3.5"
      }
    >
      <section className="flex w-full flex-col items-center gap-3.5 rounded-[20px] border border-[#E7E5E4] bg-white p-[18px]">
        <div className="w-full text-center">
          <h2 className="text-sm font-semibold text-stone-900">
            Programa de fidelización
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Los clientes escanean y se registran
          </p>
        </div>

        <div className="flex w-full items-center gap-2 rounded-xl bg-[#F5F5F4] px-3 py-3">
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-900">
            {display || "…"}
          </p>
          <button
            type="button"
            onClick={() => void copyLink()}
            disabled={!url}
            aria-label="Copiar link"
            className="shrink-0 disabled:opacity-40"
          >
            {copied ? (
              <Check size={18} strokeWidth={2.5} className="text-green-600" />
            ) : (
              <Copy size={18} strokeWidth={2} className="text-[var(--color-primary,#F97316)]" />
            )}
          </button>
        </div>

        <div className="flex w-full flex-col gap-2.5">
          <button
            type="button"
            onClick={() => void downloadQr()}
            disabled={!url}
            className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary,#F97316)] text-[15px] font-bold text-white disabled:opacity-50"
          >
            <Download size={18} strokeWidth={2} aria-hidden />
            Descargar QR
          </button>
          <button
            type="button"
            onClick={() => void copyLink()}
            disabled={!url}
            className={`inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border text-[15px] font-bold transition-colors duration-200 disabled:opacity-50 ${
              copied
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-[#E7E5E4] bg-white text-stone-900"
            }`}
          >
            {copied ? (
              <>
                <Check size={18} strokeWidth={2.5} aria-hidden />
                Copiado
              </>
            ) : (
              <>
                <Link2 size={18} strokeWidth={2} aria-hidden />
                Copiar link
              </>
            )}
          </button>
          <div className="grid w-full grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={openWhatsApp}
              disabled={!url}
              className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#25D366] bg-white text-[15px] font-bold text-[#25D366] disabled:opacity-50"
            >
              <MessageCircle size={18} strokeWidth={2} aria-hidden />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => void shareNative()}
              disabled={!url}
              className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#E7E5E4] bg-white text-[15px] font-bold text-stone-600 disabled:opacity-50"
            >
              <Share2 size={18} strokeWidth={2} aria-hidden />
              Más
            </button>
          </div>
        </div>

        {origin ? (
          <BrandedQr
            business={business}
            origin={origin}
            size={showExtras ? "lg" : "md"}
          />
        ) : (
          <div className="h-[280px] w-full max-w-[220px] animate-pulse rounded-[20px] bg-[#F5F5F4]" />
        )}

        {toast ? (
          <p role="status" className="text-sm font-semibold text-green-700">
            {toast}
          </p>
        ) : null}
      </section>

      {showExtras ? (
        <>
          <div className="flex w-full items-start gap-2.5 rounded-[14px] bg-[#FFF7ED] p-3.5">
            <Lightbulb
              size={18}
              strokeWidth={2}
              className="mt-0.5 shrink-0 text-[var(--color-primary,#F97316)]"
              aria-hidden
            />
            <p className="text-xs leading-[1.35] text-stone-900">{tip}</p>
          </div>
          <div className="w-full rounded-2xl bg-[#F5F5F4] px-4 py-4 text-center">
            <p className="text-xs text-stone-500">
              Próximamente: poster para imprimir
            </p>
          </div>
        </>
      ) : (
        <p className="text-center text-xs leading-relaxed text-stone-500">
          Imprimí el QR o mostralo en el mostrador. El equipo también puede
          abrirlo desde el Panel.
        </p>
      )}
    </div>
  )
}
