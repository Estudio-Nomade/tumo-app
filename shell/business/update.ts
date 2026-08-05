import type { Business } from "@/lib/modules"
import type { JsonResult } from "@/modules/loyalty/lib/types"

export type BusinessBrandPatch = {
  name?: string
  primary_color?: string
  secondary_color?: string
}

export type BusinessUpdateDeps = {
  updateBusinessRow: (
    businessId: string,
    patch: BusinessBrandPatch
  ) => Promise<Business | null>
}

const HEX = /^#[0-9A-Fa-f]{6}$/

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

function normalizeHex(value: string): string | null {
  const v = value.trim()
  if (!HEX.test(v)) return null
  return v.toUpperCase()
}

export function parseBusinessUpdate(
  body: unknown
): ParseResult<BusinessBrandPatch> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "JSON inválido." }
  }
  const raw = body as Record<string, unknown>
  const patch: BusinessBrandPatch = {}

  if ("name" in raw) {
    if (typeof raw.name !== "string") {
      return { ok: false, error: "El nombre debe ser texto." }
    }
    const name = raw.name.trim()
    if (name.length < 2 || name.length > 60) {
      return {
        ok: false,
        error: "El nombre debe tener entre 2 y 60 caracteres.",
      }
    }
    patch.name = name
  }

  if ("primary_color" in raw) {
    if (typeof raw.primary_color !== "string") {
      return { ok: false, error: "Color principal inválido." }
    }
    const hex = normalizeHex(raw.primary_color)
    if (!hex) {
      return {
        ok: false,
        error: "Color principal debe ser hex #RRGGBB.",
      }
    }
    patch.primary_color = hex
  }

  if ("secondary_color" in raw) {
    if (typeof raw.secondary_color !== "string") {
      return { ok: false, error: "Color secundario inválido." }
    }
    const hex = normalizeHex(raw.secondary_color)
    if (!hex) {
      return {
        ok: false,
        error: "Color secundario debe ser hex #RRGGBB.",
      }
    }
    patch.secondary_color = hex
  }

  if (
    patch.name === undefined &&
    patch.primary_color === undefined &&
    patch.secondary_color === undefined
  ) {
    return { ok: false, error: "No hay cambios para guardar." }
  }

  return { ok: true, value: patch }
}

export async function updateBusiness(
  deps: BusinessUpdateDeps,
  input: {
    businessId: string
    role: string
    patch: BusinessBrandPatch
  }
): Promise<JsonResult> {
  if (input.role !== "owner") {
    return { status: 403, body: { error: "Solo el dueño puede editar." } }
  }

  const updated = await deps.updateBusinessRow(input.businessId, input.patch)
  if (!updated) {
    return { status: 404, body: { error: "Negocio no encontrado" } }
  }

  return {
    status: 200,
    body: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      primary_color: updated.primary_color,
      secondary_color: updated.secondary_color,
    },
  }
}
