import { getBusiness } from "@/shell/db/business"
import { sql } from "@/shell/db/pool"
import type { CatalogDeps } from "@/modules/orders/api/catalog"
import type { OrdersDeps } from "@/modules/orders/api/orders"
import type { ProductsDeps } from "@/modules/orders/api/products"
import type { MetricsDeps } from "@/modules/orders/api/metrics"
import type { SettingsDeps } from "@/modules/orders/api/settings"
import {
  notifyOrderStatusChange,
  type NotifyDeps,
} from "@/modules/orders/api/notifications"
import { generateCustomerCode } from "@/modules/orders/lib/generate-code"
import type { SqlTagged } from "@/modules/orders/lib/types"

const taggedSql = sql as unknown as SqlTagged

async function defaultSendWhatsApp(): Promise<void> {
  // TODO(provider): cablear un proveedor de WhatsApp (Twilio/UltraMsg u otro).
  // Sin credenciales configuradas, las notificaciones no se envían (como hoy).
}

const notificationsDeps: NotifyDeps = {
  sql: taggedSql,
  sendWhatsApp: defaultSendWhatsApp,
}

export const catalogDeps: CatalogDeps = {
  sql: taggedSql,
  getBusiness,
}

export const ordersDeps: OrdersDeps = {
  sql: taggedSql,
  getBusiness,
  generateCode: generateCustomerCode,
  notify: (orderId, newStatus) =>
    notifyOrderStatusChange(notificationsDeps, { orderId, newStatus }),
}

export const productsDeps: ProductsDeps = {
  sql: taggedSql,
}

export const metricsDeps: MetricsDeps = {
  sql: taggedSql,
}

export const settingsDeps: SettingsDeps = {
  sql: taggedSql,
}
