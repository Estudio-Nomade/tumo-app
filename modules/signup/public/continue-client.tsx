"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

type SessionPayload = {
  id: string
  status: string
  email: string
  business_name: string
  plan_id: string
  business_id: string | null
  slug: string | null
  provision_error: string | null
  error?: string
}

export function SignupContinueClient({
  sessionId,
  result,
}: {
  sessionId: string
  result?: string | null
}) {
  const missing = !sessionId
  const [data, setData] = useState<SessionPayload | null>(null)
  const [err, setErr] = useState<string | null>(
    missing ? "Falta session." : null
  )

  const load = useCallback(async (id: string, attempt: number) => {
    const res = await fetch(`/api/signup/session?id=${encodeURIComponent(id)}`)
    const json = (await res.json()) as SessionPayload
    if (!res.ok) {
      setErr(json.error ?? "No se pudo leer la sesión.")
      return null
    }
    setData(json)
    setErr(null)
    return { json, attempt }
  }, [])

  useEffect(() => {
    if (missing) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = async (attempt: number) => {
      try {
        const res = await load(sessionId, attempt)
        if (cancelled || !res) return
        const { json } = res
        if (
          json.status !== "provisioned" &&
          json.status !== "failed" &&
          json.status !== "cancelled" &&
          attempt < 20
        ) {
          timer = setTimeout(() => {
            void tick(attempt + 1)
          }, 1000)
        }
      } catch {
        if (!cancelled) setErr("Error de red.")
      }
    }

    void tick(1)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [sessionId, missing, load])

  if (err) {
    return (
      <Box>
        <h1 className="text-xl font-bold">No pudimos continuar</h1>
        <p className="text-[#A3A3A3]">{err}</p>
        <Link className="underline" href="/signup">
          Volver a intentar
        </Link>
      </Box>
    )
  }

  if (!data) {
    return (
      <Box>
        <h1 className="text-xl font-bold">Confirmando pago…</h1>
        <p className="text-[#A3A3A3]">Un segundo.</p>
      </Box>
    )
  }

  if (result === "failure" || data.status === "failed") {
    return (
      <Box>
        <h1 className="text-xl font-bold">Pago no aprobado</h1>
        <p className="text-[#A3A3A3]">Podés reintentar el alta.</p>
        <Link className="underline" href={`/signup?plan=${data.plan_id}`}>
          Volver al signup
        </Link>
      </Box>
    )
  }

  if (data.status === "provisioned") {
    return (
      <Box>
        <h1 className="text-xl font-bold">¡Listo!</h1>
        <p className="text-[#A3A3A3]">
          {data.business_name} quedó activo (plan {data.plan_id}).
        </p>
        {data.slug ? (
          <Link
            className="mt-4 inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#7754E3] px-6 font-bold"
            href={`/${data.slug}/dashboard`}
          >
            Ir al panel
          </Link>
        ) : (
          <p className="text-sm text-[#A3A3A3]">
            Session provisioned. Login email owner llega en el próximo slice.
          </p>
        )}
      </Box>
    )
  }

  return (
    <Box>
      <h1 className="text-xl font-bold">Estado: {data.status}</h1>
      <p className="text-[#A3A3A3]">
        Si ya pagaste, esperá un momento o refrescá.
      </p>
      {data.provision_error ? (
        <p className="text-red-300 text-sm">{data.provision_error}</p>
      ) : null}
    </Box>
  )
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-2xl border border-[#262626] bg-[#0A0A0A] p-6 text-white">
      {children}
    </div>
  )
}
