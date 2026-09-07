import { describe, expect, mock, test } from "bun:test"
import {
  approvePayment,
  rejectPayment,
  submitTransferReceipt,
  type PaymentsDeps,
} from "@/modules/turnos/api/payments"

function makeSql() {
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    void values
    const q = strings.join(" ")
    if (q.includes("FROM turnos_bookings")) {
      return Promise.resolve([
        {
          id: "b1",
          price_cents: 12500,
          payment_method: "transfer",
          payment_status: "pending_receipt",
          status: "pending",
        },
      ])
    }
    if (q.includes("INSERT INTO turnos_payments")) {
      return Promise.resolve([{ id: "pay1" }])
    }
    if (q.includes("UPDATE turnos_bookings")) {
      return Promise.resolve([
        {
          id: "b1",
          payment_status: "paid",
          status: "confirmed",
        },
      ])
    }
    return Promise.resolve([])
  })
  return sql as unknown as PaymentsDeps["sql"]
}

describe("submitTransferReceipt", () => {
  test("sin bytes → 400", async () => {
    const r = await submitTransferReceipt(
      { sql: makeSql() },
      {
        businessId: "biz-1",
        bookingId: "b1",
        receiptBytes: new Uint8Array(),
        receiptMime: "image/jpeg",
        receiptFilename: "x.jpg",
      }
    )
    expect(r.status).toBe(400)
  })

  test("ok → pending_verification", async () => {
    const r = await submitTransferReceipt(
      { sql: makeSql() },
      {
        businessId: "biz-1",
        bookingId: "b1",
        receiptBytes: new Uint8Array([1, 2, 3]),
        receiptMime: "image/jpeg",
        receiptFilename: "x.jpg",
      }
    )
    expect(r.status).toBe(200)
  })

  test("mime inválido → 400", async () => {
    const r = await submitTransferReceipt(
      { sql: makeSql() },
      {
        businessId: "biz-1",
        bookingId: "b1",
        receiptBytes: new Uint8Array([1, 2, 3]),
        receiptMime: "application/pdf",
        receiptFilename: "x.pdf",
      }
    )
    expect(r.status).toBe(400)
    expect(String((r.body as { error?: string }).error)).toMatch(/foto|JPG|PNG/i)
  })

  test("bytes > tope → 400", async () => {
    const big = new Uint8Array(3 * 1024 * 1024 + 1)
    const r = await submitTransferReceipt(
      { sql: makeSql() },
      {
        businessId: "biz-1",
        bookingId: "b1",
        receiptBytes: big,
        receiptMime: "image/jpeg",
        receiptFilename: "big.jpg",
      }
    )
    expect(r.status).toBe(400)
    expect(String((r.body as { error?: string }).error)).toMatch(/pesada/i)
  })
})

describe("approvePayment", () => {
  test("marca paid", async () => {
    const r = await approvePayment(
      { sql: makeSql() },
      { businessId: "biz-1", bookingId: "b1", employeeId: "e1" }
    )
    expect(r.status).toBe(200)
  })
})

describe("rejectPayment", () => {
  test("requiere motivo", async () => {
    const r = await rejectPayment(
      { sql: makeSql() },
      { businessId: "biz-1", bookingId: "b1", employeeId: "e1", reason: "" }
    )
    expect(r.status).toBe(400)
  })
})
