import { getBusiness } from "@/shell/db/business"
import { sql } from "@/shell/db/pool"
import type { CatalogDeps } from "@/modules/orders/api/catalog"
import type { OrdersDeps } from "@/modules/orders/api/orders"
import type { ProductsDeps } from "@/modules/orders/api/products"
import type { MetricsDeps } from "@/modules/orders/api/metrics"
import { generateCustomerCode } from "@/modules/orders/lib/generate-code"
import type { SqlTagged } from "@/modules/orders/lib/types"

const taggedSql = sql as unknown as SqlTagged

export const catalogDeps: CatalogDeps = {
  sql: taggedSql,
  getBusiness,
}

export const ordersDeps: OrdersDeps = {
  sql: taggedSql,
  getBusiness,
  generateCode: generateCustomerCode,
}

export const productsDeps: ProductsDeps = {
  sql: taggedSql,
}

export const metricsDeps: MetricsDeps = {
  sql: taggedSql,
}
