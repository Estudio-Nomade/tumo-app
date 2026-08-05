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

const shellClassName =
  "fixed inset-0 z-10 flex min-h-[100dvh] w-full flex-col justify-between overflow-y-auto bg-gradient-to-b from-[color-mix(in_srgb,var(--color-primary,#F97316)_88%,white)] via-[var(--color-primary,#F97316)] to-[color-mix(in_srgb,var(--color-primary,#F97316)_78%,#9a3412)] px-7 pt-[max(1.5rem,env(safe-area-inset-top))] pr-[max(1.75rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))] pl-[max(1.75rem,env(safe-area-inset-left))] text-white"

function formatTime(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function MessageIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
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
      <div className={shellClassName}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 self-center py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/20 text-white backdrop-blur-sm">
            <MessageIcon className="h-8 w-8" />
          </div>
          <p
            role="alert"
            className="max-w-sm rounded-xl bg-white px-4 py-3 text-center text-sm font-medium text-red-600 shadow-sm"
          >
            Falta el código de verificación. Volvé a pedir uno.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${slug}/login`)}
            className="h-14 w-full max-w-sm !rounded-2xl !border-2 !border-white/85 !bg-transparent text-base font-bold !text-white"
          >
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={shellClassName}>
      <header className="flex flex-col items-center gap-2.5 pt-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/20 text-white shadow-sm backdrop-blur-sm">
          <MessageIcon className="h-8 w-8" />
        </div>
        <h1 className="max-w-sm text-center text-xl font-extrabold tracking-tight">
          Te mandamos un código de 6 dígitos a tu WhatsApp
        </h1>
      </header>

      <div className="flex w-full max-w-sm flex-col items-center gap-5 self-center py-6">
        <div
          className={`flex w-full justify-between gap-1.5 ${shake ? "animate-shake" : ""}`}
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
                  className="h-14 min-w-0 flex-1 rounded-2xl border-0 bg-white text-center text-xl font-bold text-stone-900 shadow-none outline-none ring-0 transition focus:ring-2 focus:ring-white/80 disabled:opacity-50"
              aria-label={`Dígito ${index + 1}`}
            />
          ))}
        </div>

        <div aria-live="polite" className="min-h-5 w-full text-center">
          {status === "loading" ? (
            <p className="text-sm font-medium text-white/90">Un momento…</p>
          ) : null}
        </div>

        {error ? (
          <p
            role="alert"
            className="w-full rounded-xl bg-white px-3 py-2 text-center text-sm font-medium text-red-600 shadow-sm"
          >
            {error}
          </p>
        ) : null}

        {secondsLeft > 0 ? (
          <p className="text-center text-sm text-white/85">
            Reenviar código en{" "}
            <span className="font-semibold tabular-nums text-white">
              {formatTime(secondsLeft)}
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void resendCode()}
            disabled={status === "loading"}
            className="text-sm font-bold text-white underline decoration-white/50 underline-offset-4 disabled:opacity-60"
          >
            Reenviar código
          </button>
        )}
      </div>

      <footer className="flex w-full max-w-sm flex-col self-center pb-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${slug}/login`)}
          className="h-14 w-full !rounded-2xl !border-2 !border-white/85 !bg-transparent text-base font-bold !text-white"
        >
          Volver
        </Button>
      </footer>
    </div>
  )
}
