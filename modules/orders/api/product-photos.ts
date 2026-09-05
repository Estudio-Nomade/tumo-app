import type { JsonResult, SqlTagged } from "@/modules/orders/lib/types"

export const PRODUCT_PHOTOS_BUCKET = "product-photos"
export const MAX_PRODUCT_PHOTOS = 8
export const MAX_PRODUCT_PHOTO_BYTES = 2 * 1024 * 1024

export const ALLOWED_PRODUCT_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export type ProductPhotoFileInput = {
  bytes: Uint8Array
  contentType: string
  size: number
}

export type ProductPhotoStorage = {
  upload: (
    path: string,
    bytes: Uint8Array,
    contentType: string
  ) => Promise<{ publicUrl: string }>
  remove: (path: string) => Promise<void>
}

export type ProductPhotosDeps = {
  sql: SqlTagged
  storage: ProductPhotoStorage
}

export type ProductPhotoDto = {
  id: string
  url: string
  sortOrder: number
}

export function parseProductPhotoStoragePath(url: string): string | null {
  try {
    const u = new URL(url)
    const marker = `/storage/v1/object/public/${PRODUCT_PHOTOS_BUCKET}/`
    const idx = u.pathname.indexOf(marker)
    if (idx === -1) return null
    const path = u.pathname.slice(idx + marker.length)
    return path.length > 0 ? decodeURIComponent(path) : null
  } catch {
    return null
  }
}

async function assertOwnedProduct(
  sql: SqlTagged,
  productId: string,
  businessId: string
): Promise<boolean> {
  const rows = (await sql`
    SELECT id, business_id
    FROM products
    WHERE id = ${productId} AND business_id = ${businessId}
    LIMIT 1
  `) as { id: string; business_id: string }[]
  return Boolean(rows[0])
}

export async function syncProductCoverPhoto(
  sql: SqlTagged,
  productId: string
): Promise<string | null> {
  const rows = (await sql`
    SELECT url
    FROM product_photos
    WHERE product_id = ${productId}
    ORDER BY sort_order ASC, created_at ASC
    LIMIT 1
  `) as { url: string }[]
  const cover = rows[0]?.url ?? null
  await sql`
    UPDATE products
    SET photo = ${cover}
    WHERE id = ${productId}
  `
  return cover
}

export async function listProductPhotos(
  deps: ProductPhotosDeps,
  input: { productId: string; businessId: string }
): Promise<JsonResult> {
  const productId = input.productId?.trim() ?? ""
  const businessId = input.businessId?.trim() ?? ""
  if (!productId || !businessId) {
    return { status: 400, body: { error: "Datos incompletos." } }
  }
  if (!(await assertOwnedProduct(deps.sql, productId, businessId))) {
    return { status: 404, body: { error: "No encontramos ese producto." } }
  }

  const rows = (await deps.sql`
    SELECT id, url, sort_order
    FROM product_photos
    WHERE product_id = ${productId}
    ORDER BY sort_order ASC, created_at ASC
  `) as { id: string; url: string; sort_order: number }[]

  const photos: ProductPhotoDto[] = rows.map((r) => ({
    id: r.id,
    url: r.url,
    sortOrder: Number(r.sort_order),
  }))

  return { status: 200, body: { photos } }
}

export async function addProductPhoto(
  deps: ProductPhotosDeps,
  input: {
    productId: string
    businessId: string
    file: ProductPhotoFileInput
  }
): Promise<JsonResult> {
  const productId = input.productId?.trim() ?? ""
  const businessId = input.businessId?.trim() ?? ""
  if (!productId || !businessId) {
    return { status: 400, body: { error: "Datos incompletos." } }
  }

  const ext = ALLOWED_PRODUCT_PHOTO_TYPES[input.file.contentType]
  if (!ext) {
    return {
      status: 400,
      body: { error: "Usá una imagen JPEG, PNG o WebP." },
    }
  }

  const byteLength = input.file.bytes.byteLength
  const claimed = input.file.size
  const size = Number.isFinite(claimed) ? Math.max(claimed, byteLength) : byteLength
  if (byteLength <= 0 || size <= 0 || size > MAX_PRODUCT_PHOTO_BYTES) {
    return {
      status: 400,
      body: { error: "La imagen debe pesar como máximo 2 MB." },
    }
  }

  if (!(await assertOwnedProduct(deps.sql, productId, businessId))) {
    return { status: 404, body: { error: "No encontramos ese producto." } }
  }

  const countRows = (await deps.sql`
    SELECT COUNT(*)::int AS n
    FROM product_photos
    WHERE product_id = ${productId}
  `) as { n: number }[]
  const count = Number(countRows[0]?.n ?? 0)
  if (count >= MAX_PRODUCT_PHOTOS) {
    return {
      status: 400,
      body: { error: "Podés subir hasta 8 fotos." },
    }
  }

  const maxOrderRows = (await deps.sql`
    SELECT COALESCE(MAX(sort_order), -1)::int AS m
    FROM product_photos
    WHERE product_id = ${productId}
  `) as { m: number }[]
  const sortOrder = Number(maxOrderRows[0]?.m ?? -1) + 1

  const objectId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const path = `${businessId}/${productId}/${objectId}.${ext}`

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
          "No se pudo subir la foto. Revisá la configuración de Storage.",
      },
    }
  }

  const versioned = publicUrl.includes("?")
    ? `${publicUrl}&v=${Date.now()}`
    : `${publicUrl}?v=${Date.now()}`

  let row: { id: string; url: string; sort_order: number } | undefined
  try {
    const inserted = (await deps.sql`
      INSERT INTO product_photos (product_id, url, sort_order)
      VALUES (${productId}, ${versioned}, ${sortOrder})
      RETURNING id, url, sort_order
    `) as { id: string; url: string; sort_order: number }[]
    row = inserted[0]
  } catch {
    try {
      await deps.storage.remove(path)
    } catch {
      // best-effort orphan cleanup
    }
    return { status: 404, body: { error: "No encontramos ese producto." } }
  }

  if (!row) {
    try {
      await deps.storage.remove(path)
    } catch {
      // best-effort
    }
    return { status: 500, body: { error: "No se pudo guardar la foto." } }
  }

  try {
    await syncProductCoverPhoto(deps.sql, productId)
  } catch {
    // cover repair best-effort; row already saved
  }

  return {
    status: 200,
    body: {
      id: row.id,
      url: row.url,
      sortOrder: Number(row.sort_order),
    },
  }
}

export async function removeProductPhoto(
  deps: ProductPhotosDeps,
  input: { productId: string; businessId: string; photoId: string }
): Promise<JsonResult> {
  const productId = input.productId?.trim() ?? ""
  const businessId = input.businessId?.trim() ?? ""
  const photoId = input.photoId?.trim() ?? ""
  if (!productId || !businessId || !photoId) {
    return { status: 400, body: { error: "Datos incompletos." } }
  }

  if (!(await assertOwnedProduct(deps.sql, productId, businessId))) {
    return { status: 404, body: { error: "No encontramos ese producto." } }
  }

  const deleted = (await deps.sql`
    DELETE FROM product_photos
    WHERE id = ${photoId} AND product_id = ${productId}
    RETURNING id, url, sort_order
  `) as { id: string; url: string; sort_order: number }[]

  if (!deleted[0]) {
    return { status: 404, body: { error: "No encontramos esa foto." } }
  }

  const storagePath = parseProductPhotoStoragePath(deleted[0].url)
  if (storagePath) {
    try {
      await deps.storage.remove(storagePath)
    } catch {
      // best-effort
    }
  }

  await syncProductCoverPhoto(deps.sql, productId)

  return { status: 200, body: { id: deleted[0].id } }
}
