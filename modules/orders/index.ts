import type { Module } from "@/lib/modules"
import { getRecentActivity } from "@/modules/orders/api/metrics"
import { metricsDeps } from "@/modules/orders/lib/default-deps"
import { OrdersHomeSection } from "@/modules/orders/dashboard/home-section"

export const ordersModule: Module = {
  id: "orders",
  name: "Pedidos",
  icon: "receipt",
  dashboardPath: "orders",
  HomeSection: OrdersHomeSection,
  getRecentActivity: (businessId, limit) =>
    getRecentActivity(metricsDeps, { businessId, limit }),
}
