"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import type { Business } from "@/lib/modules"
import ShareProgram from "@/modules/loyalty/dashboard/share-program"

export default function LoyaltyQrView({
  business,
  role,
  slug,
}: {
  business: Business
  role: string
  slug: string
}) {
  const router = useRouter()
  const isOwner = role === "owner"
  const backHref = isOwner
    ? `/${slug}/dashboard/settings`
    : `/${slug}/dashboard/loyalty`

  if (!isOwner) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-1">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) router.back()
            else router.push(backHref)
          }}
          className="inline-flex items-center gap-2 self-start text-[13px] font-semibold text-stone-500 transition hover:text-stone-900"
        >
          <ArrowLeft size={20} strokeWidth={2} aria-hidden />
          Volver al panel
        </button>

        <header className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
            Escaneá para sumar
          </h1>
          <p className="text-sm text-stone-500">{business.name}</p>
        </header>

        <ShareProgram business={business} variant="counter" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-[18px]">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) router.back()
          else router.push(backHref)
        }}
        className="inline-flex items-center gap-2 text-[13px] font-semibold text-stone-500 transition hover:text-stone-900"
      >
        <ArrowLeft size={18} strokeWidth={2} aria-hidden />
        Volver
      </button>

      <header className="flex flex-col gap-0.5">
        <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
          Ajustes
        </h1>
        <p className="text-[13px] text-stone-500">Programa y cuenta</p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          NEGOCIO
        </div>
        <p className="text-[15px] font-semibold text-stone-900">
          {business.name}
        </p>
      </section>

      <ShareProgram business={business} variant="owner" />
    </div>
  )
}
