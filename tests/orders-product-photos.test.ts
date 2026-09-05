import { describe, expect, mock, test } from "bun:test"
import {
  ALLOWED_PRODUCT_PHOTO_TYPES,
  MAX_PRODUCT_PHOTO_BYTES,
  MAX_PRODUCT_PHOTOS,
  addProductPhoto,
  listProductPhotos,
  parseProductPhotoStoragePath,
  removeProductPhoto,
  type ProductPhotosDeps,
} from "@/modules/orders/api/product-photos"

function pngBytes(n = 64): Uint8Array {
  return new Uint8Array(n).fill(1)
}

function makeSql(state: {
  product?: { id: string; business_id: string } | null
  photoCount?: number
  photos?: {
    id: string
    product_id: string
    url: string
    sort_order: number
  }[]
  insertedPhoto?: { id: string; url: string; sort_order: number }
  deletedPhoto?: { id: string; url: string; sort_order: number } | null
  remainingAfterDelete?: {
    id: string
    url: string
    sort_order: number
  }[]
} = {}) {
  const calls: { q: string; values: unknown[] }[] = []
  const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join(" ")
    calls.push({ q, values })

    if (q.includes("FROM products") && q.includes("business_id")) {
      return Promise.resolve(state.product === null ? [] : [state.product ?? { id: "p1", business_id: "biz-1" }])
    }
    if (q.includes("COUNT") && q.includes("product_photos")) {
      return Promise.resolve([{ n: state.photoCount ?? state.photos?.length ?? 0 }])
    }
    if (q.includes("MAX(sort_order)")) {
      const n = state.photoCount ?? state.photos?.length ?? 0
      return Promise.resolve([{ m: n > 0 ? n - 1 : -1 }])
    }
    if (q.includes("INSERT INTO product_photos")) {
      return Promise.resolve([
        state.insertedPhoto ?? {
          id: "ph-new",
          url: "https://cdn.example/product-photos/biz-1/p1/x.png",
          sort_order: state.photoCount ?? 0,
        },
      ])
    }
    if (q.includes("DELETE FROM product_photos")) {
      return Promise.resolve(
        state.deletedPhoto === null
          ? []
          : [state.deletedPhoto ?? { id: "ph1", url: "https://cdn.example/product-photos/biz-1/p1/a.png", sort_order: 0 }]
      )
    }
    if (q.includes("UPDATE products") && q.includes("photo")) {
      return Promise.resolve([{ id: "p1" }])
    }
    if (q.includes("FROM product_photos") && q.includes("ORDER BY sort_order")) {
      const list =
        state.remainingAfterDelete ??
        state.photos ?? [
          {
            id: "ph1",
            product_id: "p1",
            url: "https://cdn.example/product-photos/biz-1/p1/a.png",
            sort_order: 0,
          },
        ]
      return Promise.resolve(
        [...list].sort((a, b) => a.sort_order - b.sort_order)
      )
    }
    if (q.includes("FROM product_photos")) {
      return Promise.resolve(state.photos ?? [])
    }
    return Promise.resolve([])
  })
  return { sql, calls }
}

function makeDeps(overrides: Partial<ProductPhotosDeps> = {}): ProductPhotosDeps {
  const { sql } = makeSql()
  return {
    sql: sql as unknown as ProductPhotosDeps["sql"],
    storage: {
      upload: mock(() =>
        Promise.resolve({
          publicUrl: "https://cdn.example/storage/v1/object/public/product-photos/biz-1/p1/x.png",
        })
      ),
      remove: mock(() => Promise.resolve()),
    },
    ...overrides,
  }
}

describe("addProductPhoto", () => {
  test("mime inválido → 400", async () => {
    const r = await addProductPhoto(makeDeps(), {
      productId: "p1",
      businessId: "biz-1",
      file: { bytes: pngBytes(), contentType: "application/pdf", size: 64 },
    })
    expect(r.status).toBe(400)
    expect(String((r.body as { error: string }).error)).toMatch(/JPEG|PNG|WebP/i)
  })

  test("archivo >2MB → 400", async () => {
    const r = await addProductPhoto(makeDeps(), {
      productId: "p1",
      businessId: "biz-1",
      file: {
        bytes: pngBytes(8),
        contentType: "image/png",
        size: MAX_PRODUCT_PHOTO_BYTES + 1,
      },
    })
    expect(r.status).toBe(400)
    expect(String((r.body as { error: string }).error)).toMatch(/2/)
  })

  test("máximo 8 → 400", async () => {
    const { sql } = makeSql({ photoCount: MAX_PRODUCT_PHOTOS })
    const r = await addProductPhoto(
      makeDeps({ sql: sql as unknown as ProductPhotosDeps["sql"] }),
      {
        productId: "p1",
        businessId: "biz-1",
        file: { bytes: pngBytes(), contentType: "image/png", size: 64 },
      }
    )
    expect(r.status).toBe(400)
    expect(String((r.body as { error: string }).error)).toMatch(/8/)
  })

  test("producto de otro business → 404", async () => {
    const { sql } = makeSql({ product: null })
    const r = await addProductPhoto(
      makeDeps({ sql: sql as unknown as ProductPhotosDeps["sql"] }),
      {
        productId: "p-other",
        businessId: "biz-1",
        file: { bytes: pngBytes(), contentType: "image/png", size: 64 },
      }
    )
    expect(r.status).toBe(404)
  })

  test("OK: sube, inserta sort_order y actualiza cover", async () => {
    const upload = mock(() =>
      Promise.resolve({
        publicUrl:
          "https://xxx.supabase.co/storage/v1/object/public/product-photos/biz-1/p1/uuid.png",
      })
    )
    const calls: { q: string; values: unknown[] }[] = []
    const sql = mock((strings: TemplateStringsArray, ...values: unknown[]) => {
      const q = strings.join(" ")
      calls.push({ q, values })
      if (q.includes("FROM products") && q.includes("business_id")) {
        return Promise.resolve([{ id: "p1", business_id: "biz-1" }])
      }
      if (q.includes("COUNT") && q.includes("product_photos")) {
        return Promise.resolve([{ n: 1 }])
      }
      if (q.includes("MAX(sort_order)")) {
        return Promise.resolve([{ m: 0 }])
      }
      if (q.includes("INSERT INTO product_photos")) {
        return Promise.resolve([
          {
            id: "ph2",
            url: "https://xxx.supabase.co/storage/v1/object/public/product-photos/biz-1/p1/uuid.png",
            sort_order: 1,
          },
        ])
      }
      if (q.includes("UPDATE products") && q.includes("photo")) {
        return Promise.resolve([{ id: "p1" }])
      }
      if (q.includes("FROM product_photos") && q.includes("ORDER BY sort_order")) {
        return Promise.resolve([
          {
            id: "ph1",
            url: "https://cdn/a.png",
            sort_order: 0,
          },
        ])
      }
      return Promise.resolve([])
    })
    const r = await addProductPhoto(
      {
        sql: sql as unknown as ProductPhotosDeps["sql"],
        storage: { upload, remove: mock(() => Promise.resolve()) },
      },
      {
        productId: "p1",
        businessId: "biz-1",
        file: { bytes: pngBytes(), contentType: "image/png", size: 64 },
      }
    )
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({
      id: "ph2",
      url: expect.stringContaining("product-photos"),
      sortOrder: 1,
    })
    expect(upload).toHaveBeenCalled()
    expect(calls.some((c) => c.q.includes("INSERT INTO product_photos"))).toBe(true)
    expect(calls.some((c) => c.q.includes("UPDATE products") && c.q.includes("photo"))).toBe(true)
  })

  test("storage falla → 503", async () => {
    const calls: { q: string }[] = []
    const sql = mock((strings: TemplateStringsArray, ..._values: unknown[]) => {
      const q = strings.join(" ")
      calls.push({ q })
      if (q.includes("FROM products")) {
        return Promise.resolve([{ id: "p1", business_id: "biz-1" }])
      }
      if (q.includes("COUNT")) return Promise.resolve([{ n: 0 }])
      if (q.includes("MAX(sort_order)")) return Promise.resolve([{ m: -1 }])
      return Promise.resolve([])
    })
    const r = await addProductPhoto(
      {
        sql: sql as unknown as ProductPhotosDeps["sql"],
        storage: {
          upload: mock(() => Promise.reject(new Error("no storage"))),
          remove: mock(() => Promise.resolve()),
        },
      },
      {
        productId: "p1",
        businessId: "biz-1",
        file: { bytes: pngBytes(), contentType: "image/jpeg", size: 64 },
      }
    )
    expect(r.status).toBe(503)
  })

  test("INSERT falla tras upload → limpia storage", async () => {
    const remove = mock(() => Promise.resolve())
    const sql = mock((strings: TemplateStringsArray) => {
      const q = strings.join(" ")
      if (q.includes("FROM products")) {
        return Promise.resolve([{ id: "p1", business_id: "biz-1" }])
      }
      if (q.includes("COUNT")) return Promise.resolve([{ n: 0 }])
      if (q.includes("MAX(sort_order)")) return Promise.resolve([{ m: -1 }])
      if (q.includes("INSERT INTO product_photos")) {
        return Promise.reject(new Error("fk"))
      }
      return Promise.resolve([])
    })
    const r = await addProductPhoto(
      {
        sql: sql as unknown as ProductPhotosDeps["sql"],
        storage: {
          upload: mock(() =>
            Promise.resolve({
              publicUrl:
                "https://xxx.supabase.co/storage/v1/object/public/product-photos/biz-1/p1/x.png",
            })
          ),
          remove,
        },
      },
      {
        productId: "p1",
        businessId: "biz-1",
        file: { bytes: pngBytes(), contentType: "image/png", size: 64 },
      }
    )
    expect(r.status).toBe(404)
    expect(remove).toHaveBeenCalled()
  })
})

describe("removeProductPhoto", () => {
  test("borra, limpia storage y actualiza cover a la siguiente", async () => {
    const remove = mock(() => Promise.resolve())
    const { sql, calls } = makeSql({
      deletedPhoto: {
        id: "ph1",
        url: "https://xxx.supabase.co/storage/v1/object/public/product-photos/biz-1/p1/a.png",
        sort_order: 0,
      },
      remainingAfterDelete: [
        {
          id: "ph2",
          url: "https://xxx.supabase.co/storage/v1/object/public/product-photos/biz-1/p1/b.png",
          sort_order: 1,
        },
      ],
    })
    const r = await removeProductPhoto(
      {
        sql: sql as unknown as ProductPhotosDeps["sql"],
        storage: { upload: mock(() => Promise.resolve({ publicUrl: "x" })), remove },
      },
      { productId: "p1", businessId: "biz-1", photoId: "ph1" }
    )
    expect(r.status).toBe(200)
    expect(remove).toHaveBeenCalled()
    expect(calls.some((c) => c.q.includes("UPDATE products") && c.q.includes("photo"))).toBe(true)
  })

  test("foto inexistente → 404", async () => {
    const { sql } = makeSql({ deletedPhoto: null })
    const r = await removeProductPhoto(
      makeDeps({ sql: sql as unknown as ProductPhotosDeps["sql"] }),
      { productId: "p1", businessId: "biz-1", photoId: "nope" }
    )
    expect(r.status).toBe(404)
  })
})

describe("listProductPhotos", () => {
  test("devuelve fotos ordenadas", async () => {
    const { sql } = makeSql({
      photos: [
        {
          id: "ph2",
          product_id: "p1",
          url: "https://cdn/b.png",
          sort_order: 1,
        },
        {
          id: "ph1",
          product_id: "p1",
          url: "https://cdn/a.png",
          sort_order: 0,
        },
      ],
    })
    const r = await listProductPhotos(
      makeDeps({ sql: sql as unknown as ProductPhotosDeps["sql"] }),
      { productId: "p1", businessId: "biz-1" }
    )
    expect(r.status).toBe(200)
    const photos = (r.body as { photos: { id: string; sortOrder: number }[] }).photos
    expect(photos.map((p) => p.id)).toEqual(["ph1", "ph2"])
  })
})

describe("parseProductPhotoStoragePath", () => {
  test("extrae path del bucket product-photos", () => {
    const path = parseProductPhotoStoragePath(
      "https://xxx.supabase.co/storage/v1/object/public/product-photos/biz-1/p1/uuid.png?v=1"
    )
    expect(path).toBe("biz-1/p1/uuid.png")
  })

  test("ignora URLs de otro bucket", () => {
    expect(
      parseProductPhotoStoragePath(
        "https://xxx.supabase.co/storage/v1/object/public/business-logos/b1/logo.png"
      )
    ).toBeNull()
  })
})

describe("constantes", () => {
  test("límite y mimes", () => {
    expect(MAX_PRODUCT_PHOTOS).toBe(8)
    expect(MAX_PRODUCT_PHOTO_BYTES).toBe(2 * 1024 * 1024)
    expect(ALLOWED_PRODUCT_PHOTO_TYPES["image/jpeg"]).toBeTruthy()
    expect(ALLOWED_PRODUCT_PHOTO_TYPES["image/png"]).toBeTruthy()
    expect(ALLOWED_PRODUCT_PHOTO_TYPES["image/webp"]).toBeTruthy()
  })
})
