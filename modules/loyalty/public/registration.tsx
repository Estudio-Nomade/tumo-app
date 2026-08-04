"use client"

import { FormEvent, useState } from "react"
import { useParams } from "next/navigation"
import Button from "@/shell/ui/Button"
import Input from "@/shell/ui/Input"
import LoyaltyCard, {
  type LoyaltyCardData,
} from "@/modules/loyalty/public/card"

type Mode = "register" | "login"

export default function LoyaltyRegistration({
  initialCustomer,
}: {
  initialCustomer?: LoyaltyCardData | null
}) {
  const params = useParams<{ slug: string }>()
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
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      {mode === "register" ? (
        <form onSubmit={onRegister} className="flex flex-col gap-4">
          <Input
            label="Tu nombre"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Tu WhatsApp"
            name="phone"
            type="tel"
            placeholder="+54 9 11 1234-5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Input
            label="Cumpleaños (opcional)"
            name="birthday"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando…" : "Empezar a sumar visitas"}
          </Button>
          <button
            type="button"
            className="text-left text-sm text-gray-600 underline"
            onClick={() => {
              setMode("login")
              setError("")
            }}
          >
            ¿Ya tenés cuenta? Ingresá tu WhatsApp
          </button>
        </form>
      ) : (
        <form onSubmit={onLogin} className="flex flex-col gap-4">
          <Input
            label="Tu WhatsApp"
            name="phone"
            type="tel"
            placeholder="+54 9 11 1234-5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Buscando…" : "Ingresar"}
          </Button>
          <button
            type="button"
            className="text-left text-sm text-gray-600 underline"
            onClick={() => {
              setMode("register")
              setError("")
            }}
          >
            Volver al registro
          </button>
        </form>
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
