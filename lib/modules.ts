import type { ComponentType } from "react"
import { loyaltyModule } from "@/modules/loyalty"

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

const registry: Record<string, Module> = {
  loyalty: loyaltyModule,
}

export function getActiveModules(business: Business): Module[] {
  return business.active_modules
    .map((id) => registry[id])
    .filter((mod): mod is Module => Boolean(mod))
}
