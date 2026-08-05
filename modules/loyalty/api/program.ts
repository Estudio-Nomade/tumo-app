import type { Business } from "@/lib/modules"
import type { JsonResult } from "@/modules/loyalty/lib/types"

export type ProgramPatch = {
  purchases_needed?: number
  reward_name?: string
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

export function parseProgramUpdate(body: unknown): ParseResult<ProgramPatch> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "JSON inválido." }
  }
  const raw = body as Record<string, unknown>
  const patch: ProgramPatch = {}

  if ("purchases_needed" in raw) {
    const n =
      typeof raw.purchases_needed === "number"
        ? raw.purchases_needed
        : typeof raw.purchases_needed === "string"
          ? Number(raw.purchases_needed)
          : NaN
    if (!Number.isInteger(n) || n < 2 || n > 50) {
      return {
        ok: false,
        error: "Las compras para canjear deben ser un entero entre 2 y 50.",
      }
    }
    patch.purchases_needed = n
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

  if (
    patch.purchases_needed === undefined &&
    patch.reward_name === undefined
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
      purchases_needed: updated.purchases_needed,
      reward_name: updated.reward_name,
    },
  }
}
