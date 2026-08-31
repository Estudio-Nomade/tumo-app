"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DEV_OTP_CODE } from "@/modules/admin/lib/types"

type Step = "phone" | "code"

export function AdminLoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("phone")
  const [phone, setPhone] = useState("")
  const [maskId, setMaskId] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = (await res.json()) as { maskId?: string; error?: string }
      if (!res.ok || !data.maskId) {
        setError(data.error ?? "No pudimos mandar el código.")
        return
      }
      setMaskId(data.maskId)
      setStep("code")
    } catch {
      setError("No pudimos mandar el código.")
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, maskId, code }),
      })
      const data = (await res.json()) as {
        success?: boolean
        redirect?: string
        error?: string
      }
      if (!res.ok || !data.success) {
        setError(data.error ?? "Código inválido.")
        return
      }
      router.push(data.redirect ?? "/admin")
      router.refresh()
    } catch {
      setError("No pudimos verificar el código.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">Admin Tumo</h1>
      <p className="mt-1 text-sm text-slate-500">
        Acceso interno del equipo. Solo números en allowlist.
      </p>

      {step === "phone" ? (
        <form onSubmit={sendCode} className="mt-6 flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-700">
            WhatsApp
            <Input
              className="mt-1 h-11"
              type="tel"
              autoComplete="tel"
              placeholder="+54 9 11 …"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-11" disabled={loading}>
            {loading ? "Enviando…" : "Enviar código"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-6 flex flex-col gap-3">
          <p className="text-sm text-slate-600">Código enviado a {phone}</p>
          <label className="text-sm font-medium text-slate-700">
            Código
            <Input
              className="mt-1 h-11 tracking-widest"
              inputMode="numeric"
              maxLength={6}
              placeholder={DEV_OTP_CODE}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-11" disabled={loading}>
            {loading ? "Verificando…" : "Entrar"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10"
            onClick={() => {
              setStep("phone")
              setCode("")
              setError("")
            }}
          >
            Cambiar número
          </Button>
        </form>
      )}
    </div>
  )
}
