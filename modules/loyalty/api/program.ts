import type { Business } from "@/lib/modules"
import type { JsonResult, PointRange } from "@/modules/loyalty/lib/types"

export type ProgramPatch = {
  points_needed?: number
  reward_name?: string
  point_ranges?: PointRange[]
}

export type ProgramUpdateDeps = {
  updateProgramRow: (
    businessId: string,
    patch: ProgramPatch
  ) => Promise<Business | null>
}

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export function validatePointRanges(
  ranges: unknown
): ParseResult<PointRange[]> {
  if (!Array.isArray(ranges) || ranges.length < 1) {
    return { ok: false, error: "Configurá al menos un tramo de puntos." }
  }

  const parsed: PointRange[] = []
  let zeroPtBands = 0

  for (let i = 0; i < ranges.length; i++) {
    const raw = ranges[i]
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "Tramo inválido." }
    }
    const r = raw as Record<string, unknown>
    const min =
      typeof r.min_cents === "number"
        ? r.min_cents
        : typeof r.min_cents === "string"
          ? Number(r.min_cents)
          : NaN
    const points =
      typeof r.points === "number"
        ? r.points
        : typeof r.points === "string"
          ? Number(r.points)
          : NaN
    let max: number | null
    if (r.max_cents === null || r.max_cents === undefined) {
      max = null
    } else if (typeof r.max_cents === "number") {
      max = r.max_cents
    } else if (typeof r.max_cents === "string") {
      max = Number(r.max_cents)
    } else {
      return { ok: false, error: "Techo de tramo inválido." }
    }

    if (!Number.isInteger(min) || min < 0) {
      return { ok: false, error: "El mínimo del tramo debe ser un entero ≥ 0." }
    }
    if (!Number.isInteger(points) || points < 0 || points > 1_000_000) {
      return {
        ok: false,
        error: "Los puntos del tramo deben ser un entero entre 0 y 1000000.",
      }
    }
    if (max !== null && (!Number.isInteger(max) || max <= min)) {
      return {
        ok: false,
        error: "El techo del tramo debe ser mayor que el mínimo.",
      }
    }

    if (points === 0) zeroPtBands++
    if (zeroPtBands > 1) {
      return {
        ok: false,
        error: "Solo puede haber un tramo con 0 puntos (piso).",
      }
    }
    if (points === 0 && i !== 0) {
      return {
        ok: false,
        error: "El tramo de 0 puntos solo puede ser el primero.",
      }
    }
    if (i > 0 && points === 0) {
      /* already handled */
    }
    if (points === 0 && i === 0) {
      /* ok */
    } else if (i > 0 || points > 0) {
      if (i > 0 && points <= 0) {
        return { ok: false, error: "Los tramos después del piso deben sumar puntos." }
      }
    }

    parsed.push({ min_cents: min, max_cents: max, points })
  }

  for (let i = 0; i < parsed.length; i++) {
    const band = parsed[i]
    const isLast = i === parsed.length - 1
    if (isLast) {
      if (band.max_cents !== null) {
        return {
          ok: false,
          error: "El último tramo debe quedar abierto (sin techo).",
        }
      }
    } else {
      if (band.max_cents === null) {
        return {
          ok: false,
          error: "Solo el último tramo puede quedar abierto.",
        }
      }
      const next = parsed[i + 1]
      if (band.max_cents !== next.min_cents) {
        return {
          ok: false,
          error: "Los tramos deben ser contiguos (sin huecos ni solapes).",
        }
      }
    }
    if (i > 0 && parsed[i].min_cents <= parsed[i - 1].min_cents) {
      return { ok: false, error: "Los mínimos deben ser estrictamente crecientes." }
    }
  }

  const earning = parsed.filter((b) => b.points > 0)
  if (earning.length < 1) {
    return { ok: false, error: "Debe haber al menos un tramo que sume puntos." }
  }

  return { ok: true, value: parsed }
}

export function parseProgramUpdate(body: unknown): ParseResult<ProgramPatch> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "JSON inválido." }
  }
  const raw = body as Record<string, unknown>
  const patch: ProgramPatch = {}

  if ("points_needed" in raw || "purchases_needed" in raw) {
    const src =
      "points_needed" in raw ? raw.points_needed : raw.purchases_needed
    const n =
      typeof src === "number"
        ? src
        : typeof src === "string"
          ? Number(src)
          : NaN
    if (!Number.isInteger(n) || n < 2 || n > 10000) {
      return {
        ok: false,
        error: "Los puntos para canjear deben ser un entero entre 2 y 10000.",
      }
    }
    patch.points_needed = n
  }

  if ("reward_name" in raw) {
    if (typeof raw.reward_name !== "string") {
      return { ok: false, error: "El nombre del premio debe ser texto." }
    }
    const reward = raw.reward_name.trim()
    if (reward.length < 2 || reward.length > 40) {
      return {
        ok: false,
        error: "El premio debe tener entre 2 y 40 caracteres.",
      }
    }
    patch.reward_name = reward
  }

  if ("point_ranges" in raw) {
    const validated = validatePointRanges(raw.point_ranges)
    if (!validated.ok) return validated
    patch.point_ranges = validated.value
  }

  if (
    patch.points_needed === undefined &&
    patch.reward_name === undefined &&
    patch.point_ranges === undefined
  ) {
    return { ok: false, error: "No hay cambios para guardar." }
  }

  return { ok: true, value: patch }
}

export async function updateProgram(
  deps: ProgramUpdateDeps,
  input: {
    businessId: string
    role: string
    patch: ProgramPatch
  }
): Promise<JsonResult> {
  if (input.role !== "owner") {
    return { status: 403, body: { error: "Solo el dueño puede editar." } }
  }

  const updated = await deps.updateProgramRow(input.businessId, input.patch)
  if (!updated) {
    return { status: 404, body: { error: "Negocio no encontrado" } }
  }

  return {
    status: 200,
    body: {
      id: updated.id,
      points_needed: updated.points_needed,
      reward_name: updated.reward_name,
      point_ranges: updated.point_ranges,
    },
  }
}
