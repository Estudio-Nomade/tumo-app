"use client"

import { FormEvent, useState } from "react"
import { useParams } from "next/navigation"
import Button from "@/shell/ui/Button"
import Input from "@/shell/ui/Input"
import LoyaltyCard, {
  type LoyaltyCardData,
} from "@/modules/loyalty/public/card"
import { useBusiness } from "@/shell/context/business"

type Mode = "register" | "login"

const inputClassName =
  "h-[52px] !rounded-[14px] !border-0 !bg-[#F5F5F4] px-4 text-base text-stone-900 shadow-none placeholder:text-[#A8A29E] focus:!ring-2 focus:!ring-[var(--color-primary,#F97316)]/30"

export default function LoyaltyRegistration({
  initialCustomer,
}: {
  initialCustomer?: LoyaltyCardData | null
}) {
  const params = useParams<{ slug: string }>()
  const business = useBusiness()
  const slug = params.slug
  const [mode, setMode] = useState<Mode>("register")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [birthday, setBirthday] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [customer, setCustomer] = useState<LoyaltyCardData | null>(
    initialCustomer ?? null
  )
  const businessInitial = (business.name?.trim()?.[0] ?? "T").toUpperCase()

  async function onRegister(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/loyalty/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          birthday: birthday || undefined,
          slug,
        }),
      })
      const data = (await res.json()) as LoyaltyCardData & { error?: string }
      if (!res.ok) {
        setError(data.error ?? "No pudimos registrarte.")
        return
      }
      setCustomer(data)
    } catch {
      setError("No pudimos registrarte. Probá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const qs = new URLSearchParams({ phone, slug })
      const res = await fetch(`/api/loyalty/customers?${qs.toString()}`)
      const data = (await res.json()) as LoyaltyCardData & { error?: string }
      if (!res.ok) {
        setError(data.error ?? "No encontramos tu cuenta.")
        return
      }
      setCustomer(data)
    } catch {
      setError("No pudimos ingresar. Probá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  if (customer) {
    return <LoyaltyCard customer={customer} slug={slug} />
  }

  return (
    <div className="fixed inset-0 z-10 flex min-h-[100dvh] w-full flex-col items-center overflow-y-auto bg-white pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1.5rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))]">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-[18px] py-3">
        <header className="flex flex-col items-center gap-2.5 text-center">
          {business.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logo}
              alt={business.name}
              className="h-[72px] w-[72px] rounded-[20px] object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-[var(--color-primary,#F97316)] text-2xl font-extrabold text-white"
            >
              {businessInitial}
            </div>
          )}
          <h1 className="text-xl font-extrabold tracking-tight text-stone-900">
            {business.name}
          </h1>
          <p className="text-xs text-stone-500">Programa de fidelización</p>
        </header>

        <h2 className="text-center text-[22px] font-bold tracking-tight text-stone-900">
          {mode === "register"
            ? "Empezá a sumar puntos"
            : "Ingresá tu WhatsApp"}
        </h2>
        <p className="text-center text-[13px] leading-relaxed text-stone-500">
          {mode === "register"
            ? `Registrate en segundos y ganá tu ${business.reward_name || "premio"} en cada ${business.purchases_needed || 10} ${business.purchases_needed === 1 ? "compra" : "compras"}.`
            : "Buscamos tu tarjeta con el número de WhatsApp."}
        </p>

        {mode === "register" ? (
          <form onSubmit={onRegister} className="flex flex-col gap-3">
            <div className="[&_label>span]:text-[13px] [&_label>span]:font-medium [&_label>span]:text-stone-900">
              <Input
                label="Tu nombre"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClassName}
              />
            </div>
            <div className="[&_label>span]:text-[13px] [&_label>span]:font-medium [&_label>span]:text-stone-900">
              <Input
                label="WhatsApp"
                name="phone"
                type="tel"
                placeholder="+54 9 11 1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className={inputClassName}
              />
            </div>
            <div className="[&_label>span]:text-[13px] [&_label>span]:font-medium [&_label>span]:text-stone-900">
              <Input
                label="Cumpleaños (opcional)"
                name="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className={`${inputClassName} !border !border-[#E7E5E4] !bg-white`}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-[54px] w-full !rounded-[14px] text-base font-bold disabled:opacity-70"
            >
              {loading ? "Guardando…" : "Empezar a sumar puntos"}
            </Button>
            <button
              type="button"
              className="flex items-center justify-center gap-1 pt-1 text-center text-xs text-stone-500"
              onClick={() => {
                setMode("login")
                setError("")
              }}
            >
              ¿Ya tenés cuenta?
              <span className="font-semibold text-[var(--color-primary,#F97316)]">
                Ingresá tu WhatsApp
              </span>
            </button>
          </form>
        ) : (
          <form onSubmit={onLogin} className="flex flex-col gap-3">
            <div className="[&_label>span]:text-[13px] [&_label>span]:font-medium [&_label>span]:text-stone-900">
              <Input
                label="WhatsApp"
                name="phone"
                type="tel"
                placeholder="+54 9 11 1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className={inputClassName}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-[54px] w-full !rounded-[14px] text-base font-bold disabled:opacity-70"
            >
              {loading ? "Buscando…" : "Ingresar"}
            </Button>
            <button
              type="button"
              className="pt-1 text-center text-xs font-semibold text-[var(--color-primary,#F97316)]"
              onClick={() => {
                setMode("register")
                setError("")
              }}
            >
              Volver al registro
            </button>
          </form>
        )}

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
