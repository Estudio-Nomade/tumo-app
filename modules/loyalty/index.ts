import type { Module } from "@/lib/modules"
import { getRecentActivity } from "@/modules/loyalty/api/metrics"
import { metricsDeps } from "@/modules/loyalty/lib/default-deps"
import { LoyaltyHomeSection } from "@/modules/loyalty/dashboard/home-section"
import {
  LoyaltyMetrics,
  LoyaltyTimeline,
} from "@/modules/loyalty/dashboard/widgets"

export const loyaltyModule: Module = {
  id: "loyalty",
  name: "Fidelización",
  icon: "gift",
  dashboardPath: "loyalty",
  dashboardWidgets: [LoyaltyMetrics, LoyaltyTimeline],
  getRecentActivity: (businessId, limit) =>
    getRecentActivity(metricsDeps, { businessId, limit }),
  HomeSection: LoyaltyHomeSection,
}
