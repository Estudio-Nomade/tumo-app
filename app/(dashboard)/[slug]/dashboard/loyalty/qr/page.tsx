"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import ShareProgram from "@/modules/loyalty/dashboard/share-program"
import { useBusiness } from "@/shell/context/business"

export default function LoyaltyQrPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const business = useBusiness()
  const slug = params.slug
  const [backHref, setBackHref] = useState(`/${slug}/dashboard/loyalty`)

  useEffect(() => {
    // Prefer returning to Clientes when opened from panel; Ajustes if from settings.
    const ref = document.referrer
    if (ref.includes("/dashboard/settings")) {
      setBackHref(`/${slug}/dashboard/settings`)
    } else {
      setBackHref(`/${slug}/dashboard/loyalty`)
    }
  }, [slug])

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
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

      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-[22px] font-bold tracking-tight text-stone-900">
          Escaneá para sumar
        </h1>
        <p className="text-sm text-stone-500">{business.name}</p>
      </header>

      <ShareProgram business={business} variant="fullscreen" />

      <Link
        href={backHref}
        className="text-center text-xs font-semibold text-stone-400"
      >
        Ir a Clientes
      </Link>
    </div>
  )
}
