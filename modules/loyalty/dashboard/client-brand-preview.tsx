"use client"

export type ClientBrandPreviewProps = {
  businessName: string
  primary: string
  secondary: string
  rewardName?: string
  purchasesNeeded?: number
}

export function LoyaltyClientBrandPreview({
  businessName,
  primary,
  secondary,
  rewardName = "premio",
  purchasesNeeded = 10,
}: ClientBrandPreviewProps) {
  const initial = (businessName.trim()?.[0] ?? "T").toUpperCase()
  const needed = Math.max(2, purchasesNeeded || 10)
  const current = Math.min(3, needed - 1)
  const remaining = Math.max(needed - current, 0)
  const pct = Math.min((current / needed) * 100, 100)
  const prize = rewardName.trim() || "premio"

  return (
    <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-lg">
      <div className="border-b border-stone-100 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-stone-400">
        Pantalla del cliente · Fidelización
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-[18px] text-2xl font-extrabold text-white"
            style={{ backgroundColor: primary }}
          >
            {initial}
          </div>
          <div className="text-lg font-extrabold tracking-tight text-stone-900">
            {businessName}
          </div>
          <div className="text-xs text-stone-500">Programa de fidelización</div>
        </div>

        <div className="text-center">
          <div className="text-base font-bold text-stone-900">
            Empezá a sumar puntos
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
            Ganá tu {prize} cada {needed} compras.
          </p>
        </div>

        <div
          className="flex flex-col gap-2.5 rounded-2xl p-4 text-white"
          style={{
            background: `linear-gradient(180deg, ${primary} 0%, ${primary}d0 100%)`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/85">
              Tu próxima recompensa
            </span>
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-sm"
              style={{ color: primary }}
            >
              ★
            </span>
          </div>
          <div className="text-2xl font-extrabold leading-none">
            {current} de {needed}
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: secondary }}
            />
          </div>
          <p className="text-sm font-semibold leading-snug">
            ¡Te faltan {remaining} compras para tu {prize}!
          </p>
          <span className="inline-flex w-fit rounded-full bg-black/15 px-2.5 py-1 text-[11px] font-semibold">
            {prize}
          </span>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-center">
          <div className="text-[11px] font-medium text-stone-500">
            Código del cliente (ejemplo)
          </div>
          <div className="mt-2 flex justify-center gap-1.5">
            {["4", "2", "8", "1"].map((d) => (
              <span
                key={d}
                className="flex h-11 w-10 items-center justify-center rounded-xl bg-white text-lg font-extrabold text-stone-900 shadow-sm"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
