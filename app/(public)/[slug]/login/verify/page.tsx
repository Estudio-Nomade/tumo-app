import { Suspense } from "react"
import VerifyForm from "@/shell/auth/login/verify-form"

export default function VerifyPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Suspense fallback={<p className="text-sm text-gray-600">Cargando…</p>}>
        <VerifyForm />
      </Suspense>
    </div>
  )
}
