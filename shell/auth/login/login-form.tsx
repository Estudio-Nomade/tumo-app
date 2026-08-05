"use client"

import { FormEvent, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Button from "@/shell/ui/Button"
import PhoneInput from "@/shell/ui/phone-input"
import { useBusiness } from "@/shell/context/business"

type Status = "idle" | "loading" | "error"

export default function LoginForm() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const business = useBusiness()
  const slug = params.slug
  const [phone, setPhone] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState("")

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus("loading")
    setError("")

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, slug }),
      })
      const data = (await res.json()) as { maskId?: string; error?: string }

      if (!res.ok || !data.maskId) {
        setStatus("error")
        setError(data.error ?? "No pudimos mandar el código.")
        return
      }

      const qs = new URLSearchParams({
        maskId: data.maskId,
        phone,
      })
      router.push(`/${slug}/login/verify?${qs.toString()}`)
    } catch {
      setStatus("error")
      setError("No pudimos mandar el código. Probá de nuevo.")
    }
  }

  const initial = (business.name?.trim()?.[0] ?? "T").toUpperCase()

  return (
    <form
      onSubmit={onSubmit}
      className="fixed inset-0 z-10 flex min-h-[100dvh] w-full flex-col justify-between overflow-y-auto bg-gradient-to-b from-[color-mix(in_srgb,var(--color-primary,#F97316)_88%,white)] via-[var(--color-primary,#F97316)] to-[color-mix(in_srgb,var(--color-primary,#F97316)_78%,#9a3412)] px-7 pt-[max(1.5rem,env(safe-area-inset-top))] pr-[max(1.75rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))] pl-[max(1.75rem,env(safe-area-inset-left))] text-white"
    >
      <header className="flex flex-col items-center gap-2.5 pt-8">
        {business.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logo}
            alt={business.name}
            className="h-16 w-16 rounded-[20px] object-cover shadow-sm"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/20 text-2xl font-extrabold text-white backdrop-blur-sm"
          >
            {initial}
          </div>
        )}
        <h1 className="text-center text-xl font-extrabold tracking-tight">
          {business.name}
        </h1>
        <p className="text-[13px] font-normal text-[#FFEDD5]">
          Panel del comercio
        </p>
      </header>

      <div className="flex w-full max-w-sm flex-col gap-4 self-center py-6">
        <h2 className="text-2xl font-extrabold tracking-tight">
          Ingresá al panel
        </h2>

        <div className="[&_label]:gap-0 [&_label>span]:sr-only [&_div.h-\[52px\]]:h-[60px] [&_div.h-\[52px\]]:rounded-2xl [&_div.h-\[52px\]]:bg-white">
          <PhoneInput
            label="Tu WhatsApp"
            name="phone"
            value={phone}
            onChange={setPhone}
            required
            disabled={status === "loading"}
            placeholder="9 11 1234-5678"
          />
        </div>

        <Button
          type="submit"
          disabled={status === "loading"}
          className="h-14 w-full !rounded-2xl !border-0 !bg-[#1C1917] text-base font-bold !text-white disabled:opacity-70"
        >
          {status === "loading" ? "Enviando…" : "Ingresar"}
        </Button>

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-red-600 shadow-sm"
          >
            {error}
          </p>
        ) : null}
      </div>

      <footer className="flex w-full max-w-sm flex-col items-center gap-1.5 self-center text-center text-[13px] leading-snug text-white">
        <p>Te vamos a mandar un código por WhatsApp.</p>
        <p>Sin contraseñas.</p>
      </footer>
    </form>
  )
}
