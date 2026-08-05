"use client"

import type { ComponentType } from "react"
import {
  LoyaltyClientBrandPreview,
  type ClientBrandPreviewProps,
} from "@/modules/loyalty/dashboard/client-brand-preview"

/**
 * Client-side brand previews for owner "Ver como cliente".
 * When adding a module: register an entry here (and activate it on the business).
 * Settings filters by business.active_modules automatically.
 */
export type ClientBrandPreviewEntry = {
  id: string
  name: string
  icon: string
  description: string
  Preview: ComponentType<ClientBrandPreviewProps>
}

export const CLIENT_BRAND_PREVIEWS: ClientBrandPreviewEntry[] = [
  {
    id: "loyalty",
    name: "Fidelización",
    icon: "gift",
    description: "Registro y tarjeta de puntos",
    Preview: LoyaltyClientBrandPreview,
  },
]

export function getClientBrandPreviews(
  activeModuleIds: string[]
): ClientBrandPreviewEntry[] {
  const active = new Set(activeModuleIds)
  return CLIENT_BRAND_PREVIEWS.filter((entry) => active.has(entry.id))
}
