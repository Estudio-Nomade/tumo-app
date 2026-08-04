import type { ComponentType } from "react"

export type ActivityEvent = {
  timestamp: number
  icon: string
  title: string
  description: string
}

export type Business = {
  id: string
  name: string
  slug: string
  logo: string | null
  primary_color: string
  secondary_color: string
  active_modules: string[]
  purchases_needed: number
  reward_name: string
}

// Placeholder types for module routes/handlers (no real implementation yet)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Component = ComponentType<any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (...args: any[]) => any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Widget = ComponentType<any>

export interface Module {
  id: string
  name: string
  icon: string
  publicRoutes?: Record<string, Component>
  dashboardRoutes?: Record<string, Component>
  apiRoutes?: Record<string, Handler>
  dashboardWidgets?: Widget[]
  getRecentActivity?: (
    businessId: string,
    limit: number
  ) => Promise<ActivityEvent[]>
}

export function getActiveModules(_business: Business): Module[] {
  return []
}
