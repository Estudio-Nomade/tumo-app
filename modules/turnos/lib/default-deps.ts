import { getBusiness, getBusinessById } from "@/shell/db/business"
import { sql } from "@/shell/db/pool"
import type { BookingsDeps } from "@/modules/turnos/api/bookings"
import type { MetricsDeps } from "@/modules/turnos/api/metrics"
import type { PaymentsDeps } from "@/modules/turnos/api/payments"
import type { ServicesDeps } from "@/modules/turnos/api/services"
import type { SettingsDeps } from "@/modules/turnos/api/settings"
import type { SqlTagged } from "@/modules/turnos/lib/types"

const taggedSql = sql as unknown as SqlTagged

export const servicesDeps: ServicesDeps = { sql: taggedSql }
export const settingsDeps: SettingsDeps = { sql: taggedSql }
export const paymentsDeps: PaymentsDeps = { sql: taggedSql }
export const metricsDeps: MetricsDeps = { sql: taggedSql }

export const bookingsDeps: BookingsDeps = {
  sql: taggedSql,
  getBusiness: async (id: string) => getBusinessById(id),
}

export { getBusiness, getBusinessById, taggedSql }
