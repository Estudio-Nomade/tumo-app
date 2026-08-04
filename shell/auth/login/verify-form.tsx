"use client"

import {
  ClipboardEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Button from "@/shell/ui/Button"

type Status = "idle" | "loading" | "success" | "error" | "rate_limited"

const OTP_LENGTH = 6
const RESEND_SECONDS = 300

function formatTime(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function VerifyForm() {
  const params = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = params.slug
  const maskId = searchParams.get("maskId") ?? ""
  const phone = searchParams.get("phone") ?? ""
  const missingParams = !maskId || !phone

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""))
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState("")
  const [shake, setShake] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])
  const submittingRef = useRef(false)

  useEffect(() => {
    if (!missingParams) inputsRef.current[0]?.focus()
  }, [missingParams])

  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [secondsLeft])

  function updateDigit(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[index] = cleaned
    setDigits(next)
    if (cleaned && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
    if (next.every((d) => d.length === 1)) {
      void submitCode(next.join(""))
    }
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH)
    if (!text) return
    const next = Array(OTP_LENGTH)
      .fill("")
      .map((_, i) => text[i] ?? "")
    setDigits(next)
    const focusAt = Math.min(text.length, OTP_LENGTH - 1)
    inputsRef.current[focusAt]?.focus()
    if (next.every((d) => d.length === 1)) {
      void submitCode(next.join(""))
    }
  }

  async function submitCode(code: string) {
    if (
      submittingRef.current ||
      status === "rate_limited" ||
      missingParams
    ) {
      return
    }
    submittingRef.current = true
    setStatus("loading")
    setError("")

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, slug, maskId, code }),
      })
      const data = (await res.json()) as {
        success?: boolean
        redirect?: string
        error?: string
      }

      if (res.status === 429) {
        setStatus("rate_limited")
        setError(data.error ?? "Demasiados intentos. Pedí un código nuevo.")
        return
      }

      if (!res.ok || !data.success || !data.redirect) {
        setStatus("error")
        setError(data.error ?? "El código no es válido.")
        setShake(true)
        setDigits(Array(OTP_LENGTH).fill(""))
        window.setTimeout(() => {
          setShake(false)
          inputsRef.current[0]?.focus()
        }, 400)
        return
      }

      setStatus("success")
      router.push(data.redirect)
    } catch {
      setStatus("error")
      setError("No pudimos verificar el código. Probá de nuevo.")
    } finally {
      submittingRef.current = false
    }
  }

  async function resendCode() {
    if (secondsLeft > 0) return
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
        setError(data.error ?? "No pudimos reenviar el código.")
        return
      }
      const qs = new URLSearchParams({ maskId: data.maskId, phone })
      router.replace(`/${slug}/login/verify?${qs.toString()}`)
      setSecondsLeft(RESEND_SECONDS)
      setStatus("idle")
      setDigits(Array(OTP_LENGTH).fill(""))
      inputsRef.current[0]?.focus()
    } catch {
      setStatus("error")
      setError("No pudimos reenviar el código.")
    }
  }

  const disabled =
    missingParams ||
    status === "loading" ||
    status === "rate_limited" ||
    status === "success"

  if (missingParams) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
        <p className="text-sm text-red-600">
          Falta el código de verificación. Volvé a pedir uno.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${slug}/login`)}
        >
          Volver
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <p className="text-sm text-gray-700">
        Te mandamos un código de 6 dígitos a tu WhatsApp
      </p>
      <div
        className={`flex justify-between gap-2 ${shake ? "animate-shake" : ""}`}
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => updateDigit(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(index, e)}
            onPaste={onPaste}
            className="h-12 w-10 rounded-lg border border-gray-300 text-center text-lg outline-none focus:border-[var(--color-primary,#F97316)] disabled:opacity-50"
            aria-label={`Dígito ${index + 1}`}
          />
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {secondsLeft > 0 ? (
        <p className="text-sm text-gray-600">
          Reenviar código en {formatTime(secondsLeft)}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void resendCode()}
          className="text-left text-sm font-medium text-[var(--color-primary,#F97316)]"
        >
          Reenviar código
        </button>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={() => router.push(`/${slug}/login`)}
      >
        Volver
      </Button>
    </div>
  )
}
