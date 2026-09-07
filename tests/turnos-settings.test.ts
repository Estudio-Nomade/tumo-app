import { describe, expect, mock, test } from "bun:test"
import {
  getSettings,
  upsertSettings,
  type SettingsDeps,
} from "@/modules/turnos/api/settings"

type SqlJsonMarker = { __sqlJson: unknown }

function makeSql(row?: unknown) {
  const sqlFn = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
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
  return Object.assign(sqlFn, {
    json: (value: unknown): SqlJsonMarker => ({ __sqlJson: value }),
  }) as unknown as SettingsDeps["sql"]
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

  test("incluye whatsappPhone", async () => {
    const r = await getSettings(
      {
        sql: makeSql({
          business_id: "biz-1",
          transfer_alias: "a",
          transfer_cbu: "b",
          transfer_holder: "c",
          is_paused: false,
          hours: {},
          whatsapp_phone: "5491112345678",
        }),
      },
      { businessId: "biz-1" }
    )
    expect(r.status).toBe(200)
    const body = r.body as { settings: { whatsappPhone: string | null } }
    expect(body.settings.whatsappPhone).toBe("5491112345678")
  })

  test("hours jsonb string (double-encoded) se parsea a objeto", async () => {
    const doubleEncoded = JSON.stringify({
      mon: [["09:00", "18:00"]],
    })
    const r = await getSettings(
      {
        sql: makeSql({
          business_id: "biz-1",
          transfer_alias: "a",
          transfer_cbu: "b",
          transfer_holder: "c",
          is_paused: false,
          hours: doubleEncoded,
          whatsapp_phone: null,
        }),
      },
      { businessId: "biz-1" }
    )
    expect(r.status).toBe(200)
    const body = r.body as { settings: { hours: unknown } }
    expect(typeof body.settings.hours).toBe("object")
    expect(Array.isArray(body.settings.hours)).toBe(false)
    expect(
      (body.settings.hours as { mon: Array<[string, string]> }).mon
    ).toEqual([["09:00", "18:00"]])
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

  test("hours undefined preserva hours actuales vía sql.json(objeto)", async () => {
    const existingHours = {
      mon: [["10:00", "14:00"]],
      wed: [["09:00", "12:00"]],
    }
    const calls: { q: string; values: unknown[] }[] = []
    const sqlFn = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
      const q = strings.join(" ")
      calls.push({ q, values })
      if (q.includes("FROM turnos_settings")) {
        return Promise.resolve([
          {
            business_id: "biz-1",
            transfer_alias: "a",
            transfer_cbu: "b",
            transfer_holder: "c",
            is_paused: false,
            hours: existingHours,
            whatsapp_phone: null,
          },
        ])
      }
      if (q.includes("INSERT INTO turnos_settings")) {
        return Promise.resolve([
          {
            business_id: "biz-1",
            transfer_alias: "nuevo",
            transfer_cbu: "b",
            transfer_holder: "c",
            is_paused: false,
            hours: existingHours,
            whatsapp_phone: null,
          },
        ])
      }
      return Promise.resolve([])
    })
    const sql = Object.assign(sqlFn, {
      json: (value: unknown): SqlJsonMarker => ({ __sqlJson: value }),
    })
    const r = await upsertSettings(
      { sql: sql as unknown as SettingsDeps["sql"] },
      { businessId: "biz-1", transferAlias: "nuevo" }
    )
    expect(r.status).toBe(200)
    const insert = calls.find((c) => c.q.includes("INSERT INTO turnos_settings"))
    expect(insert).toBeDefined()
    expect(insert!.q).not.toContain("::jsonb")
    const hoursArg = insert!.values.find(
      (v) => v && typeof v === "object" && "__sqlJson" in (v as object)
    ) as SqlJsonMarker | undefined
    expect(hoursArg).toBeDefined()
    expect(hoursArg!.__sqlJson).toEqual(existingHours)
    expect(typeof hoursArg).not.toBe("string")
  })

  test("hours explícitos reemplazan el mapa vía sql.json", async () => {
    const newHours = { fri: [["11:00", "15:00"]] }
    const calls: { q: string; values: unknown[] }[] = []
    const sqlFn = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
      const q = strings.join(" ")
      calls.push({ q, values })
      if (q.includes("FROM turnos_settings")) {
        return Promise.resolve([
          {
            business_id: "biz-1",
            transfer_alias: "a",
            transfer_cbu: null,
            transfer_holder: null,
            is_paused: false,
            hours: { mon: [["09:00", "18:00"]] },
            whatsapp_phone: null,
          },
        ])
      }
      if (q.includes("INSERT INTO turnos_settings")) {
        return Promise.resolve([
          {
            business_id: "biz-1",
            transfer_alias: "a",
            transfer_cbu: null,
            transfer_holder: null,
            is_paused: false,
            hours: newHours,
            whatsapp_phone: null,
          },
        ])
      }
      return Promise.resolve([])
    })
    const sql = Object.assign(sqlFn, {
      json: (value: unknown): SqlJsonMarker => ({ __sqlJson: value }),
    })
    const r = await upsertSettings(
      { sql: sql as unknown as SettingsDeps["sql"] },
      { businessId: "biz-1", hours: newHours }
    )
    expect(r.status).toBe(200)
    const insert = calls.find((c) => c.q.includes("INSERT INTO turnos_settings"))
    expect(insert).toBeDefined()
    expect(insert!.q).not.toContain("::jsonb")
    const hoursArg = insert!.values.find(
      (v) => v && typeof v === "object" && "__sqlJson" in (v as object)
    ) as SqlJsonMarker | undefined
    expect(hoursArg).toBeDefined()
    expect(hoursArg!.__sqlJson).toEqual(newHours)
    expect(JSON.stringify(hoursArg!.__sqlJson)).not.toContain("mon")
  })

  test("persiste whatsappPhone en INSERT", async () => {
    const calls: { q: string; values: unknown[] }[] = []
    const sqlFn = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
      const q = strings.join(" ")
      calls.push({ q, values })
      if (q.includes("FROM turnos_settings")) {
        return Promise.resolve([
          {
            business_id: "biz-1",
            transfer_alias: null,
            transfer_cbu: null,
            transfer_holder: null,
            is_paused: false,
            hours: {},
            whatsapp_phone: null,
          },
        ])
      }
      if (q.includes("INSERT INTO turnos_settings")) {
        return Promise.resolve([
          {
            business_id: "biz-1",
            transfer_alias: null,
            transfer_cbu: null,
            transfer_holder: null,
            is_paused: false,
            hours: {},
            whatsapp_phone: "5492266515776",
          },
        ])
      }
      return Promise.resolve([])
    })
    const sql = Object.assign(sqlFn, {
      json: (value: unknown): SqlJsonMarker => ({ __sqlJson: value }),
    })
    const r = await upsertSettings(
      { sql: sql as unknown as SettingsDeps["sql"] },
      { businessId: "biz-1", whatsappPhone: "+54 9 2266 515776" }
    )
    expect(r.status).toBe(200)
    const insert = calls.find((c) => c.q.includes("INSERT INTO turnos_settings"))
    expect(insert).toBeDefined()
    expect(insert!.q).toMatch(/whatsapp_phone/)
    expect(insert!.values.some((v) => String(v).includes("2266"))).toBe(true)
  })
})
