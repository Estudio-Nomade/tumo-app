import { Suspense } from "react"
import VerifyForm from "@/shell/auth/login/verify-form"

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-10 flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-[color-mix(in_srgb,var(--color-primary,#F97316)_55%,white)] via-[var(--color-primary,#F97316)] to-[color-mix(in_srgb,var(--color-primary,#F97316)_65%,black)] px-7 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] text-sm font-medium text-white">
          Cargando…
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  )
}
