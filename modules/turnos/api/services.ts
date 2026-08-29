import type { JsonResult, SqlTagged } from "@/modules/turnos/lib/types"

export type ServicesDeps = {
  sql: SqlTagged
}

type ServiceRow = {
  id: string
  name: string
  price_cents: number
  duration_minutes: number
  is_active: boolean
  sort_order: number
}

function mapService(r: ServiceRow) {
  return {
    id: r.id,
    name: r.name,
    priceCents: r.price_cents,
    durationMinutes: r.duration_minutes,
    isActive: r.is_active,
    sortOrder: r.sort_order,
  }
}

export async function listServices(
  deps: ServicesDeps,
  input: { businessId: string; activeOnly?: boolean }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }

  const rows = input.activeOnly
    ? ((await deps.sql`
        SELECT id, name, price_cents, duration_minutes, is_active, sort_order
        FROM turnos_services
        WHERE business_id = ${businessId} AND is_active = true
        ORDER BY sort_order ASC, name ASC
      `) as ServiceRow[])
    : ((await deps.sql`
        SELECT id, name, price_cents, duration_minutes, is_active, sort_order
        FROM turnos_services
        WHERE business_id = ${businessId}
        ORDER BY sort_order ASC, name ASC
      `) as ServiceRow[])

  return {
    status: 200,
    body: { services: rows.map(mapService) },
  }
}

export async function createService(
  deps: ServicesDeps,
  input: {
    businessId: string
    name: string
    priceCents: number
    durationMinutes: number
    sortOrder?: number
  }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  const name = input.name?.trim() ?? ""
  if (!businessId) {
    return { status: 400, body: { error: "businessId es requerido." } }
  }
  if (!name) {
    return { status: 400, body: { error: "El nombre es requerido." } }
  }
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
    return { status: 400, body: { error: "Precio inválido." } }
  }
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
    return { status: 400, body: { error: "Duración inválida." } }
  }

  const rows = (await deps.sql`
    INSERT INTO turnos_services (business_id, name, price_cents, duration_minutes, sort_order)
    VALUES (
      ${businessId},
      ${name},
      ${input.priceCents},
      ${input.durationMinutes},
      ${input.sortOrder ?? 0}
    )
    RETURNING id, name, price_cents, duration_minutes, is_active, sort_order
  `) as ServiceRow[]

  const row = rows[0]
  if (!row) {
    return { status: 500, body: { error: "No se pudo crear el servicio." } }
  }

  return { status: 201, body: { service: mapService(row) } }
}

export async function updateService(
  deps: ServicesDeps,
  input: {
    businessId: string
    serviceId: string
    name?: string
    priceCents?: number
    durationMinutes?: number
    isActive?: boolean
    sortOrder?: number
  }
): Promise<JsonResult> {
  const businessId = input.businessId?.trim() ?? ""
  const serviceId = input.serviceId?.trim() ?? ""
  if (!businessId || !serviceId) {
    return { status: 400, body: { error: "businessId y serviceId son requeridos." } }
  }

  if (input.priceCents !== undefined) {
    if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
      return { status: 400, body: { error: "Precio inválido." } }
    }
  }
  if (input.durationMinutes !== undefined) {
    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
      return { status: 400, body: { error: "Duración inválida." } }
    }
  }

  const existing = (await deps.sql`
    SELECT id, name, price_cents, duration_minutes, is_active, sort_order
    FROM turnos_services
    WHERE id = ${serviceId} AND business_id = ${businessId}
  `) as ServiceRow[]

  const cur = existing[0]
  if (!cur) {
    return { status: 404, body: { error: "Servicio no encontrado." } }
  }

  const name = input.name?.trim() ?? cur.name
  const priceCents = input.priceCents ?? cur.price_cents
  const durationMinutes = input.durationMinutes ?? cur.duration_minutes
  const isActive = input.isActive ?? cur.is_active
  const sortOrder = input.sortOrder ?? cur.sort_order

  if (!name) {
    return { status: 400, body: { error: "El nombre es requerido." } }
  }

  const rows = (await deps.sql`
    UPDATE turnos_services
    SET name = ${name},
        price_cents = ${priceCents},
        duration_minutes = ${durationMinutes},
        is_active = ${isActive},
        sort_order = ${sortOrder}
    WHERE id = ${serviceId} AND business_id = ${businessId}
    RETURNING id, name, price_cents, duration_minutes, is_active, sort_order
  `) as ServiceRow[]

  const row = rows[0]
  if (!row) {
    return { status: 404, body: { error: "Servicio no encontrado." } }
  }

  return { status: 200, body: { service: mapService(row) } }
}
