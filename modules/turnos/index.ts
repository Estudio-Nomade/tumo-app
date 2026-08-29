import type { Module } from "@/lib/modules"
import { getRecentActivity } from "@/modules/turnos/api/metrics"
import { TurnosHomeSection } from "@/modules/turnos/dashboard/home-section"
import { metricsDeps } from "@/modules/turnos/lib/default-deps"

export const turnosModule: Module = {
  id: "turnos",
  name: "Turnos",
  icon: "calendar",
  dashboardPath: "turnos",
  HomeSection: TurnosHomeSection,
  getRecentActivity: (businessId, limit) =>
    getRecentActivity(metricsDeps, { businessId, limit }),
}
