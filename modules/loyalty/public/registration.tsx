"use client"

import { FormEvent, useState } from "react"
import { useParams } from "next/navigation"
import Button from "@/shell/ui/Button"
import DatePicker from "@/shell/ui/date-picker"
import Input from "@/shell/ui/Input"
import PhoneInput from "@/shell/ui/phone-input"
import LoyaltyCard, {
  type LoyaltyCardData,
} from "@/modules/loyalty/public/card"
import { useBusiness } from "@/shell/context/business"
import { isPhoneValid } from "@/lib/countries"

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
  const [birthdayEnabled, setBirthdayEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [customer, setCustomer] = useState<LoyaltyCardData | null>(
    initialCustomer ?? null
  )
  const businessInitial = (business.name?.trim()?.[0] ?? "T").toUpperCase()

  async function onRegister(e: FormEvent) {
    e.preventDefault()
    setError("")
    if (birthdayEnabled && !birthday) {
      setError("Elegí tu fecha de cumpleaños.")
      return
    }
    if (!isPhoneValid(phone)) {
      setError("Ingresá un WhatsApp válido con su prefijo.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/loyalty/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          birthday: birthdayEnabled ? birthday || undefined : undefined,
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
    setError("")
    if (!isPhoneValid(phone)) {
      setError("Ingresá un WhatsApp válido con su prefijo.")
      return
    }
    setLoading(true)
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
    return (
      <LoyaltyCard
        customer={customer}
        slug={slug}
        onSwitchAccount={() => setCustomer(null)}
      />
    )
  }

  const tagline =
    business.tagline?.trim() || "Programa de fidelización"

  return (
    <div className="fixed inset-0 z-10 flex min-h-[100dvh] w-full flex-col items-center overflow-y-auto bg-[var(--color-surface-public,#FFFFFF)] pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1.5rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))]">
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
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--color-ink-public,#1C1917)]">
            {business.name}
          </h1>
          <p className="text-xs text-[var(--color-muted-public,#78716C)]">
            {tagline}
          </p>
        </header>

        <h2 className="text-center text-[22px] font-bold tracking-tight text-[var(--color-ink-public,#1C1917)]">
          {mode === "register"
            ? "Empezá a sumar puntos"
            : "Ingresá tu WhatsApp"}
        </h2>
        <p className="text-center text-[13px] leading-relaxed text-[var(--color-muted-public,#78716C)]">
          {mode === "register"
            ? `Registrate en segundos y ganá tu ${business.reward_name || "premio"} en cada ${business.points_needed || 10} ${business.points_needed === 1 ? "punto" : "puntos"}.`
            : "Buscamos tu tarjeta con el número de WhatsApp."}
        </p>

        {mode === "register" ? (
          <form onSubmit={onRegister} className="flex flex-col gap-3">
            <div className="[&_label>span]:text-[13px] [&_label>span]:font-medium [&_label>span]:text-[var(--color-ink-public,#1C1917)]">
              <Input
                label="Tu nombre"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClassName}
              />
            </div>
            <div className="[&_label>span]:text-[13px] [&_label>span]:font-medium [&_label>span]:text-[var(--color-ink-public,#1C1917)]">
              <PhoneInput
                label="WhatsApp"
                name="phone"
                value={phone}
                onChange={setPhone}
                required
                disabled={loading}
              />
            </div>
            <div className="flex w-full flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span
                  id="birthday-label"
                  className="text-[15px] text-[var(--color-ink-public,#1C1917)]"
                >
                  ¿Fecha de cumpleaños?
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={birthdayEnabled}
                  aria-labelledby="birthday-label"
                  aria-controls="birthday-field"
                  disabled={loading}
                  onClick={() => {
                    if (birthdayEnabled) {
                      setBirthday("")
                      setBirthdayEnabled(false)
                    } else {
                      setBirthdayEnabled(true)
                    }
                  }}
                  className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary,#F97316)]/40 focus-visible:ring-offset-2 disabled:opacity-70 ${
                    birthdayEnabled
                      ? "justify-end bg-[var(--color-primary,#F97316)]"
                      : "justify-start bg-stone-300"
                  }`}
                >
                  <span
                    aria-hidden
                    className="h-[22px] w-[22px] rounded-full bg-white shadow-sm"
                  />
                </button>
              </div>
              {birthdayEnabled ? (
                <div id="birthday-field" className="w-full">
                  <DatePicker
                    id="birthday"
                    name="birthday"
                    required
                    disabled={loading}
                    aria-labelledby="birthday-label"
                    value={birthday}
                    onChange={setBirthday}
                    placeholder="Elegí tu fecha"
                  />
                </div>
              ) : null}
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-[54px] w-full !rounded-[14px] text-base font-bold disabled:opacity-70"
            >
              {loading ? "Guardando…" : "Empezar a sumar puntos"}
            </Button>
          </form>
        ) : (
          <form onSubmit={onLogin} className="flex flex-col gap-3">
            <div className="[&_label>span]:text-[13px] [&_label>span]:font-medium [&_label>span]:text-[var(--color-ink-public,#1C1917)]">
              <PhoneInput
                label="WhatsApp"
                name="phone"
                value={phone}
                onChange={setPhone}
                required
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-[54px] w-full !rounded-[14px] text-base font-bold disabled:opacity-70"
            >
              {loading ? "Buscando…" : "Ingresar"}
            </Button>
          </form>
        )}

        {mode === "register" ? (
          <button
            type="button"
            disabled={loading}
            className="flex min-h-[44px] w-full items-center justify-center gap-1 text-center text-xs text-[var(--color-muted-public,#78716C)] disabled:opacity-70"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setError("")
              setBirthday("")
              setBirthdayEnabled(false)
              setMode("login")
            }}
          >
            ¿Ya tenés cuenta?
            <span className="font-semibold text-[var(--color-primary,#F97316)]">
              Ingresá tu WhatsApp
            </span>
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            className="min-h-[44px] w-full pt-1 text-center text-xs font-semibold text-[var(--color-primary,#F97316)] disabled:opacity-70"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setError("")
              setMode("register")
            }}
          >
            Volver al registro
          </button>
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
