import type { JsonResult, SqlTagged } from "@/modules/turnos/lib/types"

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
}

function mapSettings(r: SettingsRow) {
  return {
    businessId: r.business_id,
    transferAlias: r.transfer_alias,
    transferCbu: r.transfer_cbu,
    transferHolder: r.transfer_holder,
    isPaused: r.is_paused,
    hours: r.hours ?? {},
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
    SELECT business_id, transfer_alias, transfer_cbu, transfer_holder, is_paused, hours
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

  const rows = (await deps.sql`
    INSERT INTO turnos_settings (
      business_id, transfer_alias, transfer_cbu, transfer_holder, is_paused, hours
    ) VALUES (
      ${businessId},
      ${alias},
      ${cbu},
      ${holder},
      ${isPaused},
      ${JSON.stringify(hours ?? {})}::jsonb
    )
    ON CONFLICT (business_id) DO UPDATE SET
      transfer_alias = EXCLUDED.transfer_alias,
      transfer_cbu = EXCLUDED.transfer_cbu,
      transfer_holder = EXCLUDED.transfer_holder,
      is_paused = EXCLUDED.is_paused,
      hours = EXCLUDED.hours
    RETURNING business_id, transfer_alias, transfer_cbu, transfer_holder, is_paused, hours
  `) as SettingsRow[]

  const row = rows[0]
  if (!row) {
    return { status: 500, body: { error: "No se pudo guardar la configuración." } }
  }

  return { status: 200, body: { settings: mapSettings(row) } }
}
