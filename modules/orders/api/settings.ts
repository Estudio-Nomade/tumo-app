import type { JsonResult, SqlTagged } from "@/modules/orders/lib/types"
import {
  sanitizeHours,
  type OrdersHours,
} from "@/modules/orders/lib/hours"

export type SettingsDeps = {
  sql: SqlTagged
}

type SettingsRow = {
  hours: OrdersHours | null
}

export async function getSettings(
  deps: SettingsDeps,
  input: { businessId: string }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }

  const rows = (await deps.sql`
    SELECT hours
    FROM orders_settings
    WHERE business_id = ${businessId}
    LIMIT 1
  `) as SettingsRow[]

  if (!rows[0]) {
    return { status: 404, body: { error: "No encontramos la configuración." } }
  }

  return { status: 200, body: { hours: rows[0].hours ?? {} } }
}

export async function updateHours(
  deps: SettingsDeps,
  input: { businessId: string; hours: unknown }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }

  const result = sanitizeHours(input.hours)
  if ("error" in result) {
    return { status: 400, body: { error: result.error } }
  }

  const rows = (await deps.sql`
    UPDATE orders_settings
    SET hours = ${JSON.stringify(result.hours)}::jsonb
    WHERE business_id = ${businessId}
    RETURNING hours
  `) as SettingsRow[]

  if (!rows[0]) {
    return { status: 404, body: { error: "No encontramos la configuración." } }
  }

  return { status: 200, body: { hours: rows[0].hours ?? {} } }
}
