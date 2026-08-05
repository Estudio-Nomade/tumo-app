import { Suspense } from "react"
import LoyaltyPanel from "@/modules/loyalty/dashboard/panel"

export default function DashboardLoyaltyPage() {
  return (
    <div className="p-2">
      <Suspense
        fallback={
          <div className="flex min-h-[180px] items-center justify-center text-sm text-stone-500">
            Cargando…
          </div>
        }
      >
        <LoyaltyPanel />
      </Suspense>
    </div>
  )
}
