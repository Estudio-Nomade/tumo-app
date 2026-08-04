import type { Module } from "@/lib/modules"
import { getRecentActivity } from "@/modules/loyalty/api/metrics"
import { metricsDeps } from "@/modules/loyalty/lib/default-deps"
import {
  LoyaltyMetrics,
  LoyaltyTimeline,
} from "@/modules/loyalty/dashboard/widgets"

export const loyaltyModule: Module = {
  id: "loyalty",
  name: "Fidelización",
  icon: "Gift",
  dashboardWidgets: [LoyaltyMetrics, LoyaltyTimeline],
  getRecentActivity: (businessId, limit) =>
    getRecentActivity(metricsDeps, { businessId, limit }),
}
