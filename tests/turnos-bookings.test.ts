import { describe, expect, mock, test } from "bun:test"
import {
  createBooking,
  getBooking,
  listBookings,
  type BookingsDeps,
} from "@/modules/turnos/api/bookings"

function makeDeps(opts: {
  service?: unknown
  settings?: unknown
  existing?: unknown[]
  inserted?: unknown
  customer?: unknown
  bookings?: unknown[]
} = {}): BookingsDeps {
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    void values
    const q = strings.join(" ")
    if (q.includes("FROM turnos_services")) {
      return Promise.resolve(
        opts.service
          ? [opts.service]
          : [
              {
                id: "svc1",
                name: "Corte",
                price_cents: 12500,
                duration_minutes: 30,
                is_active: true,
              },
            ]
      )
    }
    if (q.includes("FROM turnos_settings")) {
      return Promise.resolve(
        opts.settings
          ? [opts.settings]
          : [{ is_paused: false, hours: { mon: [["09:00", "18:00"]] } }]
      )
    }
    if (q.includes("FROM turnos_bookings") && q.includes("starts_at")) {
      return Promise.resolve(opts.existing ?? opts.bookings ?? [])
    }
    if (q.includes("FROM customers") || q.includes("INSERT INTO customers")) {
      return Promise.resolve(
        opts.customer ? [opts.customer] : [{ id: "cust-1", name: "María", phone: "+54911" }]
      )
    }
    if (q.includes("INSERT INTO turnos_bookings")) {
      return Promise.resolve([
        opts.inserted ?? {
          id: "b1",
          status: "confirmed",
          payment_method: "at_location",
          payment_status: "unpaid",
          service_name: "Corte",
          price_cents: 12500,
          duration_minutes: 30,
          starts_at: new Date("2026-08-31T12:00:00.000Z"),
          ends_at: new Date("2026-08-31T12:30:00.000Z"),
        },
      ])
    }
    if (q.includes("FROM turnos_bookings")) {
      return Promise.resolve(opts.bookings ?? [])
    }
    return Promise.resolve([])
  })

  return {
    sql: sql as unknown as BookingsDeps["sql"],
    getBusiness: async () =>
      ({
        id: "biz-1",
        name: "BN",
        slug: "bn",
        logo: null,
        primary_color: "#F97316",
        secondary_color: "#FACC15",
        active_modules: ["turnos"],
        points_needed: 10,
        reward_name: "x",
        point_ranges: [],
      }) as never,
  }
}

describe("createBooking", () => {
  test("módulo ausente → 404", async () => {
    const deps = makeDeps()
    deps.getBusiness = async () =>
      ({
        id: "biz-1",
        active_modules: ["loyalty"],
      }) as never
    const r = await createBooking(deps, {
      businessId: "biz-1",
      serviceId: "svc1",
      startsAt: "2026-08-31T12:00:00.000Z",
      customerName: "María",
      customerPhone: "+549111111",
      paymentMethod: "at_location",
      idempotencyKey: "k1",
    })
    expect(r.status).toBe(404)
  })

  test("crea reserva efectivo", async () => {
    const r = await createBooking(makeDeps(), {
      businessId: "biz-1",
      serviceId: "svc1",
      startsAt: "2026-08-31T12:00:00.000Z",
      customerName: "María",
      customerPhone: "+549111111",
      paymentMethod: "at_location",
      idempotencyKey: "k1",
    })
    expect(r.status).toBe(201)
    const body = r.body as { booking: { id: string; paymentMethod: string } }
    expect(body.booking.id).toBe("b1")
    expect(body.booking.paymentMethod).toBe("at_location")
  })

  test("idempotencyKey vacío → 400", async () => {
    const r = await createBooking(makeDeps(), {
      businessId: "biz-1",
      serviceId: "svc1",
      startsAt: "2026-08-31T12:00:00.000Z",
      customerName: "María",
      customerPhone: "+549111111",
      paymentMethod: "transfer",
      idempotencyKey: "",
    })
    expect(r.status).toBe(400)
  })
})

describe("listBookings", () => {
  test("businessId vacío → 400", async () => {
    const r = await listBookings(makeDeps(), { businessId: "" })
    expect(r.status).toBe(400)
  })
})

describe("getBooking", () => {
  test("ids vacíos → 400", async () => {
    const r = await getBooking(makeDeps(), { businessId: "", bookingId: "" })
    expect(r.status).toBe(400)
  })

  test("no encontrada → 404", async () => {
    const r = await getBooking(makeDeps({ bookings: [] }), {
      businessId: "biz-1",
      bookingId: "missing",
    })
    expect(r.status).toBe(404)
  })

  test("devuelve reserva", async () => {
    const row = {
      id: "b1",
      status: "confirmed",
      payment_method: "at_location",
      payment_status: "unpaid",
      service_name: "Corte",
      price_cents: 12500,
      duration_minutes: 30,
      starts_at: "2026-08-31T12:00:00.000Z",
      ends_at: "2026-08-31T12:30:00.000Z",
      customer_id: "c1",
      notes: null,
    }
    const r = await getBooking(makeDeps({ bookings: [row] }), {
      businessId: "biz-1",
      bookingId: "b1",
    })
    expect(r.status).toBe(200)
    const body = r.body as { booking: { id: string; serviceName: string } }
    expect(body.booking.id).toBe("b1")
    expect(body.booking.serviceName).toBe("Corte")
  })
})
