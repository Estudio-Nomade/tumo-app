import type { ComponentType } from "react"
import { loyaltyModule } from "@/modules/loyalty"
import { ordersModule } from "@/modules/orders"
import { turnosModule } from "@/modules/turnos"

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
  surface_color?: string | null
  tagline?: string | null
  active_modules: string[]
  points_needed: number
  reward_name: string
  point_ranges: {
    min_cents: number
    max_cents: number | null
    points: number
  }[]
  location?: string
}

export type MetricCardData = {
  value: number | string
  label: string
  icon: string
  iconColor?: string
  trend?: string
  variant?: "default" | "highlight"
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Component = ComponentType<any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (...args: any[]) => any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Widget = ComponentType<any>

export type ModuleHomeSectionProps = {
  slug: string
  business: Business
}

export interface Module {
  id: string
  name: string
  icon: string
  /** Dashboard path segment, default = id */
  dashboardPath?: string
  publicRoutes?: Record<string, Component>
  dashboardRoutes?: Record<string, Component>
  apiRoutes?: Record<string, Handler>
  dashboardWidgets?: Widget[]
  getRecentActivity?: (
    businessId: string,
    limit: number
  ) => Promise<ActivityEvent[]>
  /**
   * Owner home section for this module (async server component OK).
   * Renders metrics, CTAs, and module-specific blocks.
   */
  HomeSection?: ComponentType<ModuleHomeSectionProps>
}

const registry: Record<string, Module> = {
  loyalty: loyaltyModule,
  orders: ordersModule,
  turnos: turnosModule,
}

export function getActiveModules(business: Business): Module[] {
  return business.active_modules
    .map((id) => registry[id])
    .filter((mod): mod is Module => Boolean(mod))
}

export function getModuleDashboardHref(slug: string, mod: Module): string {
  const path = mod.dashboardPath ?? mod.id
  return `/${slug}/dashboard/${path}`
}

/** Merge activity from all modules that expose getRecentActivity. */
export async function collectRecentActivity(
  modules: Module[],
  businessId: string,
  limit: number
): Promise<ActivityEvent[]> {
  const batches = await Promise.all(
    modules.map((mod) =>
      mod.getRecentActivity
        ? mod.getRecentActivity(businessId, limit)
        : Promise.resolve([] as ActivityEvent[])
    )
  )

  return batches
    .flat()
    .filter((e) => Number.isFinite(e.timestamp))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}
