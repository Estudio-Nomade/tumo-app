import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import type { Business } from "@/lib/modules"
import { evaluateModuleAccess } from "@/shell/billing/access"
import { SubscriptionExpiredNotice } from "@/shell/billing/subscription-expired-notice"

/**
 * Page-level gate: missing business / not contracted → 404.
 * Billing mora → friendly subscription expired screen (no 404).
 */
export function ModuleAccessGate({
  business,
  moduleId,
  audience = "public",
  children,
}: {
  business: Business | null
  moduleId: string
  audience?: "public" | "owner"
  children: ReactNode
}) {
  if (!business) notFound()

  const access = evaluateModuleAccess(business, moduleId)
  if (access.ok) return <>{children}</>

  if (access.reason === "billing_overdue") {
    return (
      <SubscriptionExpiredNotice
        business={business}
        moduleId={moduleId}
        audience={audience}
      />
    )
  }

  notFound()
}
