import { describe, expect, test } from "bun:test"
import {
  isOpenNow,
  nextOpening,
  type OrdersHours,
} from "@/modules/orders/lib/hours"

// 2026-08-16 = domingo (0) · 2026-08-17 = lunes (1) · 2026-08-18 = martes (2)
// 2026-08-15 = sábado (6)
const hours: OrdersHours = {
  "0": { closed: true },
  "1": { open: "19:00", close: "01:00", closed: false },
  "2": { open: "19:00", close: "01:00", closed: false },
  "3": { open: "19:00", close: "01:00", closed: false },
  "4": { open: "19:00", close: "01:00", closed: false },
  "5": { open: "19:00", close: "01:00", closed: false },
  "6": { open: "11:00", close: "15:00", closed: false },
}

describe("isOpenNow", () => {
  test("abierto dentro de la ventana (lunes 20:00, cruza medianoche)", () => {
    expect(isOpenNow(hours, new Date(2026, 7, 17, 20, 0))).toBe(true)
  })

  test("abierto cruzando medianoche (martes 00:30, abrió el lunes 19:00)", () => {
    expect(isOpenNow(hours, new Date(2026, 7, 18, 0, 30))).toBe(true)
  })

  test("cerrado antes de abrir (lunes 18:00)", () => {
    expect(isOpenNow(hours, new Date(2026, 7, 17, 18, 0))).toBe(false)
  })

  test("cerrado tras medianoche si el día anterior estaba cerrado (lunes 00:30, domingo cerrado)", () => {
    expect(isOpenNow(hours, new Date(2026, 7, 17, 0, 30))).toBe(false)
  })

  test("ventana mismo día (sábado 12:00, 11:00–15:00)", () => {
    expect(isOpenNow(hours, new Date(2026, 7, 15, 12, 0))).toBe(true)
  })

  test("cerrado tras el cierre mismo día (sábado 16:00)", () => {
    expect(isOpenNow(hours, new Date(2026, 7, 15, 16, 0))).toBe(false)
  })

  test("domingo cerrado", () => {
    expect(isOpenNow(hours, new Date(2026, 7, 16, 12, 0))).toBe(false)
  })

  test("día sin entrada = cerrado", () => {
    const sparse: OrdersHours = { "1": { open: "10:00", close: "12:00", closed: false } }
    expect(isOpenNow(sparse, new Date(2026, 7, 17, 11, 0))).toBe(true)
    expect(isOpenNow(sparse, new Date(2026, 7, 18, 11, 0))).toBe(false)
  })
})

describe("nextOpening", () => {
  test("antes de abrir hoy → hoy", () => {
    const n = nextOpening(hours, new Date(2026, 7, 17, 18, 0))
    expect(n).toEqual({ dayLabel: "hoy", time: "19:00" })
  })

  test("domingo cerrado → mañana lunes 19:00", () => {
    const n = nextOpening(hours, new Date(2026, 7, 16, 12, 0))
    expect(n).toEqual({ dayLabel: "mañana", time: "19:00" })
  })

  test("sábado tras cierre → el lunes (salta domingo)", () => {
    const n = nextOpening(hours, new Date(2026, 7, 15, 16, 0))
    expect(n).toEqual({ dayLabel: "el lunes", time: "19:00" })
  })

  test("todo cerrado → null", () => {
    const allClosed: OrdersHours = {
      "0": { closed: true },
      "1": { closed: true },
    }
    expect(nextOpening(allClosed, new Date(2026, 7, 16, 12, 0))).toBeNull()
  })
})
