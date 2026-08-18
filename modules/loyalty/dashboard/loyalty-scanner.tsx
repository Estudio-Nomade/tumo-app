"use client"

import { useCallback, useState } from "react"
import { Scanner } from "@yudiel/react-qr-scanner"
import { parseLoyaltyQr } from "@/modules/loyalty/lib/parse-loyalty-qr"

type Props = {
  slug: string
  onCustomerCode: (code: string) => void
  paused?: boolean
}

export default function LoyaltyScanner({
  slug,
  onCustomerCode,
  paused = false,
}: Props) {
  const [error, setError] = useState("")
  const [last, setLast] = useState("")

  const onScan = useCallback(
    (detected: { rawValue: string }[]) => {
      if (paused) return
      const raw = detected[0]?.rawValue
      if (!raw || raw === last) return
      setLast(raw)
      window.setTimeout(() => setLast(""), 1500)

      const parsed = parseLoyaltyQr(raw, slug)
      if (!parsed) {
        setError("Ese QR no es de este programa. Pedile la tarjeta al cliente.")
        return
      }
      if (parsed.kind === "register") {
        setError("Ese es el QR de registro del local, no la tarjeta del cliente.")
        return
      }
      setError("")
      onCustomerCode(parsed.code)
    },
    [last, onCustomerCode, paused, slug]
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-black">
        <Scanner
          onScan={onScan}
          onError={() =>
            setError("No pudimos usar la cámara. Revisá los permisos.")
          }
          paused={paused}
          constraints={{ facingMode: "environment" }}
          styles={{ container: { width: "100%" } }}
        />
      </div>
      {error ? (
        <p className="text-center text-sm text-amber-800" role="status">
          {error}
        </p>
      ) : (
        <p className="text-center text-sm text-stone-500">
          Apuntá al QR de la tarjeta del cliente
        </p>
      )}
    </div>
  )
}
