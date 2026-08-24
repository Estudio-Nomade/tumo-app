import { describe, expect, mock, test } from "bun:test"
import {
  eventForStatus,
  notifyOrderStatusChange,
  orderStatusMessage,
  type NotifyDeps,
} from "@/modules/orders/api/notifications"

describe("eventForStatus", () => {
  test("mapea los 5 estados notificables", () => {
    expect(eventForStatus("confirmed")).toBe("confirmed")
    expect(eventForStatus("preparing")).toBe("preparing")
    expect(eventForStatus("ready")).toBe("ready")
    expect(eventForStatus("completed")).toBe("completed")
    expect(eventForStatus("rejected")).toBe("rejected")
  })

  test("estados no notificables → null", () => {
    expect(eventForStatus("pending")).toBeNull()
    expect(eventForStatus("cancelled")).toBeNull()
    expect(eventForStatus("")).toBeNull()
    expect(eventForStatus("nope")).toBeNull()
  })
})

describe("orderStatusMessage", () => {
  test("incluye el número de pedido y el nombre del negocio", () => {
    const msg = orderStatusMessage("ready", 17, "Carri")
    expect(msg).toContain("#17")
    expect(msg).toContain("Carri")
  })

  test("cada estado tiene un mensaje distinto y en lenguaje llano", () => {
    expect(orderStatusMessage("confirmed", 1, "Carri")).toMatch(/preparamos/)
    expect(orderStatusMessage("preparing", 1, "Carri")).toMatch(/preparación/)
    expect(orderStatusMessage("ready", 1, "Carri")).toMatch(/listo/)
    expect(orderStatusMessage("completed", 1, "Carri")).toMatch(/Entregamos/)
    expect(orderStatusMessage("rejected", 1, "Carri")).toMatch(/comprobante/)
  })
})

const NOTIFY_ROW = {
  order_number: 17,
  customer_phone: "5491111111111",
  business_name: "Carri",
}

function makeDeps(overrides: { row?: unknown[] | null; throwSend?: boolean } = {}) {
  const sql = mock(async () =>
    Promise.resolve(overrides.row ?? [NOTIFY_ROW])
  )
  const sent: { phone: string; message: string }[] = []
  const sendWhatsApp = mock(async (phone: string, message: string) => {
    if (overrides.throwSend) throw new Error("send failed")
    sent.push({ phone, message })
  })
  return {
    deps: { sql: sql as unknown as NotifyDeps["sql"], sendWhatsApp } as NotifyDeps,
    sent,
    sendWhatsApp,
  }
}

describe("notifyOrderStatusChange", () => {
  test("envía WhatsApp en E.164 con el mensaje del estado", async () => {
    const { deps, sent } = makeDeps()
    await notifyOrderStatusChange(deps, { orderId: "ord-1", newStatus: "confirmed" })
    expect(sent).toHaveLength(1)
    expect(sent[0].phone).toBe("+5491111111111")
    expect(sent[0].message).toContain("#17")
    expect(sent[0].message).toContain("Carri")
  })

  test("estado no notificable → no envía", async () => {
    const { deps, sent } = makeDeps()
    await notifyOrderStatusChange(deps, { orderId: "ord-1", newStatus: "pending" })
    expect(sent).toHaveLength(0)
  })

  test("pedido inexistente → no envía", async () => {
    const { deps, sent } = makeDeps({ row: [] })
    await notifyOrderStatusChange(deps, { orderId: "nope", newStatus: "ready" })
    expect(sent).toHaveLength(0)
  })

  test("cliente sin teléfono → no envía", async () => {
    const { deps, sent } = makeDeps({
      row: [{ order_number: 17, customer_phone: null, business_name: "Carri" }],
    })
    await notifyOrderStatusChange(deps, { orderId: "ord-1", newStatus: "ready" })
    expect(sent).toHaveLength(0)
  })

  test("fallo del proveedor → no lanza (best-effort)", async () => {
    const { deps } = makeDeps({ throwSend: true })
    await expect(
      notifyOrderStatusChange(deps, { orderId: "ord-1", newStatus: "completed" })
    ).resolves.toBeUndefined()
  })
})
