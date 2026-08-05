import type { Business } from "@/lib/modules"
import type { JsonResult } from "@/modules/loyalty/lib/types"

export const LOGO_BUCKET = "business-logos"
export const MAX_LOGO_BYTES = 2 * 1024 * 1024

export const ALLOWED_LOGO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export type LogoFileInput = {
  bytes: Uint8Array
  contentType: string
  size: number
}

export type LogoStorage = {
  upload: (
    path: string,
    bytes: Uint8Array,
    contentType: string
  ) => Promise<{ publicUrl: string }>
  remove: (path: string) => Promise<void>
}

export type LogoDeps = {
  storage: LogoStorage
  getBusinessById: (
    id: string
  ) => Promise<{ id: string; logo: string | null } | null>
  updateLogo: (businessId: string, logoUrl: string) => Promise<Business | null>
}

export function parseStoragePathFromPublicUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const marker = `/storage/v1/object/public/${LOGO_BUCKET}/`
    const idx = u.pathname.indexOf(marker)
    if (idx === -1) return null
    const path = u.pathname.slice(idx + marker.length)
    return path.length > 0 ? decodeURIComponent(path) : null
  } catch {
    return null
  }
}

export async function uploadBusinessLogo(
  deps: LogoDeps,
  input: {
    businessId: string
    role: string
    file: LogoFileInput
  }
): Promise<JsonResult> {
  if (input.role !== "owner") {
    return { status: 403, body: { error: "Solo el dueño puede editar." } }
  }

  const ext = ALLOWED_LOGO_TYPES[input.file.contentType]
  if (!ext) {
    return {
      status: 400,
      body: { error: "Usá una imagen JPEG, PNG o WebP." },
    }
  }

  if (
    !Number.isFinite(input.file.size) ||
    input.file.size <= 0 ||
    input.file.size > MAX_LOGO_BYTES
  ) {
    return {
      status: 400,
      body: { error: "La imagen debe pesar como máximo 2 MB." },
    }
  }

  const business = await deps.getBusinessById(input.businessId)
  if (!business) {
    return { status: 404, body: { error: "Negocio no encontrado" } }
  }

  const path = `${input.businessId}/logo.${ext}`
  let publicUrl: string
  try {
    const uploaded = await deps.storage.upload(
      path,
      input.file.bytes,
      input.file.contentType
    )
    publicUrl = uploaded.publicUrl
  } catch {
    return {
      status: 503,
      body: {
        error:
          "No se pudo subir el logo. Revisá la configuración de Storage.",
      },
    }
  }

  const versioned = publicUrl.includes("?")
    ? `${publicUrl}&v=${Date.now()}`
    : `${publicUrl}?v=${Date.now()}`

  const updated = await deps.updateLogo(input.businessId, versioned)
  if (!updated) {
    return { status: 404, body: { error: "Negocio no encontrado" } }
  }

  const oldPath = business.logo
    ? parseStoragePathFromPublicUrl(business.logo)
    : null
  if (oldPath && oldPath !== path) {
    try {
      await deps.storage.remove(oldPath)
    } catch {
      // best-effort cleanup
    }
  }

  return {
    status: 200,
    body: {
      id: updated.id,
      logo: updated.logo,
    },
  }
}
