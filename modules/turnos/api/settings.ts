import type { JsonResult, SqlTagged } from "@/modules/turnos/lib/types"
import { whatsappDigits } from "@/modules/turnos/lib/whatsapp"

export type SettingsDeps = {
  sql: SqlTagged
}

type SettingsRow = {
  business_id: string
  transfer_alias: string | null
  transfer_cbu: string | null
  transfer_holder: string | null
  is_paused: boolean
  hours: unknown
  whatsapp_phone?: string | null
}

function mapSettings(r: SettingsRow) {
  return {
    businessId: r.business_id,
    transferAlias: r.transfer_alias,
    transferCbu: r.transfer_cbu,
    transferHolder: r.transfer_holder,
    isPaused: r.is_paused,
    hours: r.hours ?? {},
    whatsappPhone: r.whatsapp_phone ?? null,
  }
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
    SELECT business_id, transfer_alias, transfer_cbu, transfer_holder, is_paused, hours, whatsapp_phone
    FROM turnos_settings
    WHERE business_id = ${businessId}
  `) as SettingsRow[]

  if (!rows[0]) {
    return {
      status: 200,
      body: {
        settings: {
          businessId,
          transferAlias: null,
          transferCbu: null,
          transferHolder: null,
          isPaused: false,
          hours: {},
          whatsappPhone: null,
        },
      },
    }
  }

  return { status: 200, body: { settings: mapSettings(rows[0]) } }
}

export async function upsertSettings(
  deps: SettingsDeps,
  input: {
    businessId: string
    transferAlias?: string | null
    transferCbu?: string | null
    transferHolder?: string | null
    isPaused?: boolean
    hours?: unknown
    whatsappPhone?: string | null
  }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }

  const current = await getSettings(deps, { businessId })
  const cur = (current.body as { settings: ReturnType<typeof mapSettings> }).settings

  const alias =
    input.transferAlias !== undefined ? input.transferAlias : cur.transferAlias
  const cbu = input.transferCbu !== undefined ? input.transferCbu : cur.transferCbu
  const holder =
    input.transferHolder !== undefined ? input.transferHolder : cur.transferHolder
  const isPaused = input.isPaused !== undefined ? input.isPaused : cur.isPaused
  const hours = input.hours !== undefined ? input.hours : cur.hours
  const rawPhone =
    input.whatsappPhone !== undefined ? input.whatsappPhone : cur.whatsappPhone
  const whatsappPhone =
    rawPhone == null || String(rawPhone).trim() === ""
      ? null
      : whatsappDigits(String(rawPhone)) || null

  const rows = (await deps.sql`
    INSERT INTO turnos_settings (
      business_id, transfer_alias, transfer_cbu, transfer_holder, is_paused, hours, whatsapp_phone
    ) VALUES (
      ${businessId},
      ${alias},
      ${cbu},
      ${holder},
      ${isPaused},
      ${JSON.stringify(hours ?? {})}::jsonb,
      ${whatsappPhone}
    )
    ON CONFLICT (business_id) DO UPDATE SET
      transfer_alias = EXCLUDED.transfer_alias,
      transfer_cbu = EXCLUDED.transfer_cbu,
      transfer_holder = EXCLUDED.transfer_holder,
      is_paused = EXCLUDED.is_paused,
      hours = EXCLUDED.hours,
      whatsapp_phone = EXCLUDED.whatsapp_phone
    RETURNING business_id, transfer_alias, transfer_cbu, transfer_holder, is_paused, hours, whatsapp_phone
  `) as SettingsRow[]

  const row = rows[0]
  if (!row) {
    return { status: 500, body: { error: "No se pudo guardar la configuración." } }
  }

  return { status: 200, body: { settings: mapSettings(row) } }
}
