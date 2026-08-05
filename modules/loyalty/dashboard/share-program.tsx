"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, Link2, Share2 } from "lucide-react"
import type { Business } from "@/lib/modules"
import {
  getLoyaltyDisplayUrl,
  getLoyaltyPublicUrl,
} from "@/lib/loyalty-url"
import BrandedQr from "@/shell/ui/branded-qr"

export default function ShareProgram({
  business,
  variant = "card",
}: {
  business: Business
  variant?: "card" | "fullscreen"
}) {
  const [origin, setOrigin] = useState("")
  const [toast, setToast] = useState("")

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const url = useMemo(
    () => (origin ? getLoyaltyPublicUrl(origin, business.slug) : ""),
    [origin, business.slug]
  )
  const display = useMemo(
    () => (origin ? getLoyaltyDisplayUrl(origin, business.slug) : ""),
    [origin, business.slug]
  )

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(""), 2200)
  }

  async function copyLink() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      flash("Link copiado")
    } catch {
      flash("No se pudo copiar")
    }
  }

  async function share() {
    if (!url) return
    const title = `${business.name} · Fidelización`
    const text = `Registrate en ${business.name} y sumá compras: ${url}`
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text, url })
        return
      }
      await navigator.clipboard.writeText(url)
      flash("Link copiado")
    } catch {
      // user cancelled share or clipboard failed — ignore
    }
  }

  if (variant === "fullscreen") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
        {origin ? (
          <BrandedQr business={business} origin={origin} size="lg" />
        ) : (
          <div className="h-[320px] w-full max-w-[280px] animate-pulse rounded-[20px] bg-[#F5F5F4]" />
        )}
        <p className="text-center text-[13px] leading-relaxed text-stone-500">
          Mostrale esta pantalla al cliente para que se registre o abra su
          tarjeta.
        </p>
        <button
          type="button"
          onClick={() => void copyLink()}
          disabled={!url}
          className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#F5F5F4] text-sm font-semibold text-stone-900 disabled:opacity-50"
        >
          <Copy size={18} strokeWidth={2} aria-hidden />
          Copiar {display || "link"}
        </button>
        {toast ? (
          <p role="status" className="text-sm font-semibold text-green-700">
            {toast}
          </p>
        ) : null}
        <p className="flex items-center gap-1.5 text-[11px] text-stone-400">
          Brillo al máximo recomendado
        </p>
      </div>
    )
  }

  return (
    <section className="flex flex-col items-center gap-3.5 rounded-[20px] border border-[#E7E5E4] bg-white p-[18px]">
      <div className="w-full text-center">
        <h2 className="text-sm font-semibold text-stone-900">
          Programa de fidelización
        </h2>
        <p className="mt-1 text-xs text-stone-500">
          Los clientes escanean y se registran
        </p>
      </div>

      {origin ? (
        <BrandedQr business={business} origin={origin} size="md" />
      ) : (
        <div className="h-[280px] w-full max-w-[280px] animate-pulse rounded-[20px] bg-[#F5F5F4]" />
      )}

      <div className="flex w-full items-center gap-2 rounded-xl bg-[#F5F5F4] px-3 py-3">
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-900">
          {display || "…"}
        </p>
        <button
          type="button"
          onClick={() => void copyLink()}
          disabled={!url}
          aria-label="Copiar link"
          className="shrink-0 text-[var(--color-primary,#F97316)] disabled:opacity-40"
        >
          <Copy size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <button
          type="button"
          onClick={() => void copyLink()}
          disabled={!url}
          className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary,#F97316)] text-[15px] font-bold text-white disabled:opacity-50"
        >
          <Link2 size={18} strokeWidth={2} aria-hidden />
          Copiar link
        </button>
        <button
          type="button"
          onClick={() => void share()}
          disabled={!url}
          className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border border-[var(--color-primary,#F97316)] bg-white text-[15px] font-bold text-[var(--color-primary,#F97316)] disabled:opacity-50"
        >
          <Share2 size={18} strokeWidth={2} aria-hidden />
          Compartir
        </button>
      </div>

      {toast ? (
        <p role="status" className="text-sm font-semibold text-green-700">
          {toast}
        </p>
      ) : null}

      <p className="text-center text-xs leading-relaxed text-stone-500">
        Imprimí el QR o mostralo en el mostrador. El equipo también puede
        abrirlo desde el Panel.
      </p>
    </section>
  )
}
