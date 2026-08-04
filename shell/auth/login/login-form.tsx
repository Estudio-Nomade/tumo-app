"use client"

import { FormEvent, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Button from "@/shell/ui/Button"
import Input from "@/shell/ui/Input"

type Status = "idle" | "loading" | "error"

export default function LoginForm() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
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

  return (
    <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <Input
        label="Tu WhatsApp"
        name="phone"
        type="tel"
        placeholder="+54 9 11 1234-5678"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />
      <Button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Enviando…" : "Ingresar"}
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <p className="text-sm text-gray-600">
        Te vamos a mandar un código por WhatsApp. Sin contraseñas.
      </p>
    </form>
  )
}
