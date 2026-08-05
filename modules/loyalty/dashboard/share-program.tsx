"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import {
  Copy,
  Lightbulb,
  Link2,
  MessageCircle,
  Share2,
  Smartphone,
} from "lucide-react"
import type { Business } from "@/lib/modules"
import {
  getLoyaltyDisplayUrl,
  getLoyaltyPublicUrl,
} from "@/lib/loyalty-url"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
  /** owner = Pencil 7 · Dueño · QR programa; counter = Pencil 8 · Empleado · Mostrar QR */
  variant?: "card" | "owner" | "counter"
}) {
  const origin = useOrigin()
  const [toast, setToast] = useState("")
  const [shareOpen, setShareOpen] = useState(false)
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
      flash("Link copiado")
    } catch {
      flash("No se pudo copiar")
    }
  }

  function openWhatsApp() {
    if (!url) return
    const href = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(href, "_blank", "noopener,noreferrer")
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
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      try {
        await navigator.clipboard.writeText(url)
        flash("Link copiado")
      } catch {
        flash("No se pudo compartir")
      }
    }
  }

  const shareSheet = (
    <Sheet open={shareOpen} onOpenChange={setShareOpen}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="gap-0 rounded-t-[28px] border-0 bg-white p-0 shadow-xl sm:max-w-md sm:left-1/2 sm:-translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-4 px-5 pb-7 pt-3">
          <div
            className="h-1 w-10 shrink-0 rounded-full bg-[#E7E5E4]"
            aria-hidden
          />
          <SheetHeader className="items-center gap-1 p-0 text-center">
            <SheetTitle className="text-lg font-bold text-stone-900">
              Compartir programa
            </SheetTitle>
            <SheetDescription className="text-[13px] text-stone-500">
              Invitá a tus clientes a sumar compras
            </SheetDescription>
          </SheetHeader>

          {origin ? (
            <BrandedQr
              business={business}
              origin={origin}
              size="sm"
              footer="Escaneá y sumá"
              showUrl={false}
              className="max-w-[200px] rounded-[18px]"
            />
          ) : (
            <div className="h-[200px] w-[200px] animate-pulse rounded-[18px] bg-[#F5F5F4]" />
          )}

          <div className="w-full rounded-xl bg-[#F5F5F4] px-3 py-3">
            <p className="truncate text-center text-xs font-semibold text-stone-900">
              {display || "…"}
            </p>
          </div>

          <div className="grid w-full grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => void copyLink()}
              disabled={!url}
              className="flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-[#FFF7ED] disabled:opacity-50"
            >
              <Copy
                size={20}
                strokeWidth={2}
                className="text-[var(--color-primary,#F97316)]"
                aria-hidden
              />
              <span className="text-xs font-semibold text-stone-900">
                Copiar
              </span>
            </button>
            <button
              type="button"
              onClick={openWhatsApp}
              disabled={!url}
              className="flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-[#DCFCE7] disabled:opacity-50"
            >
              <MessageCircle
                size={20}
                strokeWidth={2}
                className="text-[#16A34A]"
                aria-hidden
              />
              <span className="text-xs font-semibold text-stone-900">
                WhatsApp
              </span>
            </button>
            <button
              type="button"
              onClick={() => void shareNative()}
              disabled={!url}
              className="flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-[#F5F5F4] disabled:opacity-50"
            >
              <Share2
                size={20}
                strokeWidth={2}
                className="text-stone-500"
                aria-hidden
              />
              <span className="text-xs font-semibold text-stone-900">Más</span>
            </button>
          </div>

          <SheetClose
            render={
              <button
                type="button"
                className="flex h-12 w-full items-center justify-center rounded-[14px] text-sm font-semibold text-stone-500"
              />
            }
          >
            Cerrar
          </SheetClose>

          {toast && shareOpen ? (
            <p role="status" className="text-sm font-semibold text-green-700">
              {toast}
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )

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
            onClick={() => setShareOpen(true)}
            disabled={!url}
            className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border border-[var(--color-primary,#F97316)] bg-white text-[15px] font-bold text-[var(--color-primary,#F97316)] disabled:opacity-50"
          >
            <Share2 size={18} strokeWidth={2} aria-hidden />
            Compartir
          </button>
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

        {toast && !shareOpen ? (
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

      {shareSheet}
    </div>
  )
}
