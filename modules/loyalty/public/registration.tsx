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

  return (
    <div className="fixed inset-0 z-10 flex min-h-[100dvh] w-full flex-col items-center overflow-y-auto bg-[var(--color-surface-public,#FFFFFF)] pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1.25rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))]">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col py-3">
        <header className="mb-8 flex items-center gap-2.5">
          {business.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logo}
              alt=""
              className="h-10 w-10 shrink-0 rounded-[12px] object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-primary,#F97316)] text-sm font-bold text-white"
            >
              {businessInitial}
            </div>
          )}
          <p className="min-w-0 truncate text-sm font-semibold text-[var(--color-ink-public,#1C1917)]">
            {business.name}
          </p>
        </header>

        <div className="flex flex-1 flex-col">
          {step === "phone" ? (
            <form
              onSubmit={onPhoneContinue}
              className="flex flex-1 flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[var(--color-ink-public,#1C1917)]">
                  Tu WhatsApp
                </h1>
                <p className="text-[14px] leading-snug text-[var(--color-muted-public,#78716C)]">
                  Si ya estás, entramos a tu tarjeta.
                </p>
              </div>
              <PhoneInput
                label=""
                name="phone"
                value={phone}
                onChange={setPhone}
                required
                disabled={loading}
                aria-label="WhatsApp"
              />
              <div className="mt-auto flex flex-col gap-3 pt-4">
                {error ? (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                  >
                    {error}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-[54px] w-full !rounded-[14px] text-base font-bold disabled:opacity-70"
                >
                  {loading ? "Buscando…" : "Continuar"}
                </Button>
              </div>
            </form>
          ) : null}

          {step === "name" ? (
            <form
              onSubmit={onNameContinue}
              className="flex flex-1 flex-col gap-6"
            >
              <div className="flex flex-col gap-3">
                <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[var(--color-ink-public,#1C1917)]">
                  ¿Cómo te llamás?
                </h1>
                <div className="flex items-center justify-between gap-2 rounded-[14px] bg-[#F5F5F4] px-3.5 py-2.5">
                  <span className="truncate text-[13px] font-medium tabular-nums text-[var(--color-ink-public,#1C1917)]">
                    {phone}
                  </span>
                  <button
                    type="button"
                    disabled={loading}
                    aria-label={`Cambiar WhatsApp ${phone}`}
                    className="inline-flex min-h-[44px] shrink-0 items-center text-[13px] font-semibold text-[var(--color-primary,#F97316)] disabled:opacity-70"
                    onClick={goToPhone}
                  >
                    Cambiar
                  </button>
                </div>
              </div>
              <div className="[&_label>span]:sr-only">
                <Input
                  label="Tu nombre"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Tu nombre"
                  className={inputClassName}
                />
              </div>
              <div className="mt-auto flex flex-col gap-3 pt-4">
                {error ? (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                  >
                    {error}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-[54px] w-full !rounded-[14px] text-base font-bold disabled:opacity-70"
                >
                  Continuar
                </Button>
              </div>
            </form>
          ) : null}

          {step === "birthday" ? (
            <form
              onSubmit={onBirthdayContinue}
              className="flex flex-1 flex-col gap-6"
            >
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  disabled={loading}
                  className="-ml-1 inline-flex min-h-[44px] w-fit items-center gap-1 self-start text-[13px] font-semibold text-[var(--color-primary,#F97316)] disabled:opacity-70"
                  onClick={goToName}
                >
                  ← Volver
                </button>
                <div className="flex flex-col gap-2">
                  <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[var(--color-ink-public,#1C1917)]">
                    ¿Cuándo es tu cumple?
                  </h1>
                  <p className="text-[14px] leading-snug text-[var(--color-muted-public,#78716C)]">
                    Opcional · solo día y mes
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="sr-only">Mes</span>
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
                  <span className="sr-only">Día</span>
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
              <div className="mt-auto flex flex-col gap-2 pt-4">
                {error ? (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                  >
                    {error}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-[54px] w-full !rounded-[14px] text-base font-bold disabled:opacity-70"
                >
                  {loading ? "Guardando…" : "Continuar"}
                </Button>
                <button
                  type="button"
                  disabled={loading}
                  className="min-h-[44px] w-full text-center text-[14px] font-medium text-[var(--color-muted-public,#78716C)] disabled:opacity-70"
                  onClick={onSkipBirthday}
                >
                  Saltar
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}
