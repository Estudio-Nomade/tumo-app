"use client"

import { FormEvent, useState } from "react"
import { useParams } from "next/navigation"
import Button from "@/shell/ui/Button"
import Input from "@/shell/ui/Input"
import PhoneInput from "@/shell/ui/phone-input"
import LoyaltyCard, {
  type LoyaltyCardData,
} from "@/modules/loyalty/public/card"
import { toBirthdayDate } from "@/modules/loyalty/lib/birthday"
import { useBusiness } from "@/shell/context/business"
import { isPhoneValid } from "@/lib/countries"

type Step = "phone" | "name" | "birthday"

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const

const inputClassName =
  "h-[52px] !rounded-[14px] !border-0 !bg-[#F5F5F4] px-4 text-base text-stone-900 shadow-none placeholder:text-[#A8A29E] focus:!ring-2 focus:!ring-[var(--color-primary,#F97316)]/30"

const selectClassName =
  "h-[52px] w-full rounded-[14px] border-0 bg-[#F5F5F4] px-4 text-base text-stone-900 shadow-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#F97316)]/30 disabled:opacity-70"

export default function LoyaltyRegistration({
  initialCustomer,
}: {
  initialCustomer?: LoyaltyCardData | null
}) {
  const params = useParams<{ slug: string }>()
  const business = useBusiness()
  const slug = params.slug
  const [step, setStep] = useState<Step>("phone")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [birthMonth, setBirthMonth] = useState<number | null>(null)
  const [birthDay, setBirthDay] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [customer, setCustomer] = useState<LoyaltyCardData | null>(
    initialCustomer ?? null
  )
  const businessInitial = (business.name?.trim()?.[0] ?? "T").toUpperCase()

  function clearBirthday() {
    setBirthMonth(null)
    setBirthDay(null)
  }

  function goToPhone() {
    setError("")
    setName("")
    clearBirthday()
    setStep("phone")
  }

  function goToName() {
    setError("")
    clearBirthday()
    setStep("name")
  }

  async function onPhoneContinue(e: FormEvent) {
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
      if (res.status === 404) {
        setStep("name")
        return
      }
      const data = (await res.json()) as LoyaltyCardData & { error?: string }
      if (!res.ok) {
        setError(data.error ?? "No pudimos buscar tu cuenta.")
        return
      }
      setCustomer(data)
    } catch {
      setError("No pudimos buscar tu cuenta. Probá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  function onNameContinue(e: FormEvent) {
    e.preventDefault()
    setError("")
    if (!name.trim()) {
      setError("Ingresá tu nombre.")
      return
    }
    setStep("birthday")
  }

  async function register(birthdayIso?: string) {
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/loyalty/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone,
          birthday: birthdayIso,
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

  async function onBirthdayContinue(e: FormEvent) {
    e.preventDefault()
    setError("")
    if (birthMonth == null && birthDay == null) {
      await register(undefined)
      return
    }
    if (birthMonth == null || birthDay == null) {
      setError("Elegí día y mes válidos.")
      return
    }
    const iso = toBirthdayDate(birthMonth, birthDay)
    if (!iso) {
      setError("Elegí día y mes válidos.")
      return
    }
    await register(iso)
  }

  function onSkipBirthday() {
    void register(undefined)
  }

  function onSwitchAccount() {
    setCustomer(null)
    setStep("phone")
    setName("")
    setPhone("")
    clearBirthday()
    setError("")
  }

  if (customer) {
    return (
      <LoyaltyCard
        customer={customer}
        slug={slug}
        onSwitchAccount={onSwitchAccount}
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

        {step === "phone" ? (
          <>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-[var(--color-ink-public,#1C1917)]">
              Empezá con tu WhatsApp
            </h2>
            <p className="text-center text-[13px] leading-relaxed text-[var(--color-muted-public,#78716C)]">
              Si ya estás en el programa, te llevamos a tu tarjeta.
            </p>
            <form onSubmit={onPhoneContinue} className="flex flex-col gap-3">
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
                {loading ? "Buscando…" : "Continuar"}
              </Button>
            </form>
          </>
        ) : null}

        {step === "name" ? (
          <>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-[var(--color-ink-public,#1C1917)]">
              ¿Cómo te llamás?
            </h2>
            <p className="text-center text-[13px] leading-relaxed text-[var(--color-muted-public,#78716C)]">
              Teléfono fijo arriba. Podés cambiarlo si te equivocaste.
            </p>
            <div className="flex items-center justify-between gap-2 rounded-[14px] bg-[#F5F5F4] px-4 py-3">
              <span className="truncate text-sm font-medium text-[var(--color-ink-public,#1C1917)]">
                {phone}
              </span>
              <button
                type="button"
                disabled={loading}
                className="shrink-0 text-sm font-semibold text-[var(--color-primary,#F97316)] disabled:opacity-70"
                onClick={goToPhone}
              >
                Cambiar
              </button>
            </div>
            <form onSubmit={onNameContinue} className="flex flex-col gap-3">
              <div className="[&_label>span]:text-[13px] [&_label>span]:font-medium [&_label>span]:text-[var(--color-ink-public,#1C1917)]">
                <Input
                  label="Tu nombre"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className={inputClassName}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="mt-1 h-[54px] w-full !rounded-[14px] text-base font-bold disabled:opacity-70"
              >
                Continuar
              </Button>
            </form>
          </>
        ) : null}

        {step === "birthday" ? (
          <>
            <h2 className="text-center text-[22px] font-bold tracking-tight text-[var(--color-ink-public,#1C1917)]">
              ¿Cuándo es tu cumple?
            </h2>
            <p className="text-center text-[13px] leading-relaxed text-[var(--color-muted-public,#78716C)]">
              Día y mes, opcional. Sin año.
            </p>
            <button
              type="button"
              disabled={loading}
              className="self-start text-sm font-semibold text-[var(--color-primary,#F97316)] disabled:opacity-70"
              onClick={goToName}
            >
              Volver
            </button>
            <form onSubmit={onBirthdayContinue} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-[var(--color-ink-public,#1C1917)]">
                    Mes
                  </span>
                  <select
                    name="birthMonth"
                    value={birthMonth ?? ""}
                    disabled={loading}
                    className={selectClassName}
                    onChange={(e) => {
                      const v = e.target.value
                      setBirthMonth(v === "" ? null : Number(v))
                    }}
                  >
                    <option value="">Mes</option>
                    {MONTHS_ES.map((label, i) => (
                      <option key={label} value={i + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-[var(--color-ink-public,#1C1917)]">
                    Día
                  </span>
                  <select
                    name="birthDay"
                    value={birthDay ?? ""}
                    disabled={loading}
                    className={selectClassName}
                    onChange={(e) => {
                      const v = e.target.value
                      setBirthDay(v === "" ? null : Number(v))
                    }}
                  >
                    <option value="">Día</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="mt-1 h-[54px] w-full !rounded-[14px] text-base font-bold disabled:opacity-70"
              >
                {loading ? "Guardando…" : "Continuar"}
              </Button>
              <button
                type="button"
                disabled={loading}
                className="min-h-[44px] w-full text-center text-sm font-semibold text-[var(--color-muted-public,#78716C)] disabled:opacity-70"
                onClick={onSkipBirthday}
              >
                Saltar
              </button>
            </form>
          </>
        ) : null}

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
