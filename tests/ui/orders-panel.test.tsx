import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")
const panel = readFileSync(
  join(root, "modules/orders/dashboard/panel.tsx"),
  "utf8"
)
const detail = readFileSync(
  join(root, "modules/orders/dashboard/order-detail.tsx"),
  "utf8"
)

describe("OrdersPanel (source contracts)", () => {
  test("chips de filtro mapean estados", () => {
    expect(panel).toContain("Nuevos")
    expect(panel).toContain("En preparación")
    expect(panel).toContain("Listos")
    expect(panel).toContain("Entregados")
    expect(panel).toContain("Todos")
  })

  test("switch Recibiendo pedidos (!is_paused)", () => {
    expect(panel).toContain("Recibiendo pedidos")
    expect(panel).toMatch(/is_paused|isPaused/)
  })

  test("poll cada 20s + on focus", () => {
    expect(panel).toContain("20000")
    expect(panel).toContain("focus")
    expect(panel).toMatch(/setInterval/)
  })

  test("zona de atención para comprobantes", () => {
    expect(panel).toMatch(/para revisar|Revisar/)
  })

  test("card tappeable al detalle", () => {
    expect(panel).toContain("dashboard/orders")
  })
})

describe("OrderDetail (source contracts)", () => {
  test("un solo CTA grande con el próximo paso", () => {
    expect(detail).toContain("Confirmar pedido")
    expect(detail).toContain("Empezar a preparar")
    expect(detail).toContain("Marcar listo")
    expect(detail).toContain("Marcar entregado")
  })

  test("aprobar / rechazar pago", () => {
    expect(detail).toContain("Aprobar pago y confirmar")
    expect(detail).toContain("Rechazar")
  })

  test("cancelar con Dialog", () => {
    expect(detail).toContain("Cancelar pedido")
    expect(detail).toMatch(/Dialog/)
  })

  test("link a loyalty con highlight", () => {
    expect(detail).toContain("Sumar compra en Fidelización")
    expect(detail).toContain("highlight")
  })

  test("comprobante clickable", () => {
    expect(detail).toMatch(/comprobante/i)
  })

  test("elderly-UX: botones ≥56px", () => {
    expect(detail).toMatch(/min-h-\[56px\]/)
  })
})
