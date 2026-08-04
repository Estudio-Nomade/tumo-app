import type { Business } from "@/lib/modules"
import { getBusiness } from "@/shell/db/business"
import { sql } from "@/shell/db/pool"
import type { CustomerDeps } from "@/modules/loyalty/api/customers"
import type { MetricsDeps } from "@/modules/loyalty/api/metrics"
import type { PurchaseDeps } from "@/modules/loyalty/api/purchases"
import type { RedemptionDeps } from "@/modules/loyalty/api/redemptions"
import { generateLoyaltyCode } from "@/modules/loyalty/lib/generate-code"
import type { SqlTagged } from "@/modules/loyalty/lib/types"

const taggedSql = sql as unknown as SqlTagged

async function getBusinessById(id: string): Promise<Business | null> {
  const [row] = await sql<Business[]>`
    SELECT
      id, name, slug, logo, primary_color, secondary_color,
      active_modules, purchases_needed, reward_name
    FROM businesses
    WHERE id = ${id}
    LIMIT 1
  `
  return row ?? null
}

export const customerDeps: CustomerDeps = {
  sql: taggedSql,
  generateCode: generateLoyaltyCode,
  getBusiness,
}

export const purchaseDeps: PurchaseDeps = {
  sql: taggedSql,
  getBusinessById,
}

export const redemptionDeps: RedemptionDeps = {
  sql: taggedSql,
  getBusinessById,
}

export const metricsDeps: MetricsDeps = {
  sql: taggedSql,
}
