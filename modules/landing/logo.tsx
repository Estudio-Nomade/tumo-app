const LOGO_SRC = "/landing/tumo-logo-no-text.png"

/** Isotipo oficial (cubo) + wordmark tumo */
export function LandingLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={LOGO_SRC}
        alt=""
        width={32}
        height={28}
        className="h-8 w-auto shrink-0 object-contain"
        decoding="async"
      />
      <span className="font-[family-name:var(--font-geist-sans)] text-[22px] font-bold tracking-[-0.04em] text-[#FFFFFF]">
        tumo
      </span>
    </span>
  )
}
