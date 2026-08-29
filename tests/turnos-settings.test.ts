import { describe, expect, mock, test } from "bun:test"
import {
  getSettings,
  upsertSettings,
  type SettingsDeps,
} from "@/modules/turnos/api/settings"

function makeSql(row?: unknown) {
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    void values
    const q = strings.join(" ")
    if (q.includes("INSERT INTO turnos_settings") || q.includes("ON CONFLICT")) {
      return Promise.resolve([
        row ?? {
          business_id: "biz-1",
          transfer_alias: "barberia.norte",
          transfer_cbu: "000",
          transfer_holder: "BN SA",
          is_paused: false,
          hours: { mon: [["09:00", "18:00"]] },
        },
      ])
    }
    if (q.includes("FROM turnos_settings")) {
      return Promise.resolve(
        row
          ? [row]
          : [
              {
                business_id: "biz-1",
                transfer_alias: "barberia.norte",
                transfer_cbu: "000",
                transfer_holder: "BN SA",
                is_paused: false,
                hours: {},
              },
            ]
      )
    }
    return Promise.resolve([])
  })
  return sql as unknown as SettingsDeps["sql"]
}

describe("getSettings", () => {
  test("businessId vacío → 400", async () => {
    const r = await getSettings({ sql: makeSql() }, { businessId: "" })
    expect(r.status).toBe(400)
  })

  test("devuelve settings", async () => {
    const r = await getSettings({ sql: makeSql() }, { businessId: "biz-1" })
    expect(r.status).toBe(200)
    const body = r.body as { settings: { transferAlias: string; isPaused: boolean } }
    expect(body.settings.transferAlias).toBe("barberia.norte")
    expect(body.settings.isPaused).toBe(false)
  })
})

describe("upsertSettings", () => {
  test("actualiza pausa y alias", async () => {
    const r = await upsertSettings(
      { sql: makeSql() },
      {
        businessId: "biz-1",
        transferAlias: "nuevo.alias",
        isPaused: true,
      }
    )
    expect(r.status).toBe(200)
  })
})
