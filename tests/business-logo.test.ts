import { describe, expect, mock, test } from "bun:test"
import {
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_BYTES,
  parseStoragePathFromPublicUrl,
  uploadBusinessLogo,
  type LogoDeps,
} from "@/shell/business/logo"

function pngBytes(n = 64): Uint8Array {
  return new Uint8Array(n).fill(1)
}

describe("uploadBusinessLogo", () => {
  test("rechaza no-owner", async () => {
    const deps: LogoDeps = {
      storage: {
        upload: mock(() => Promise.resolve({ publicUrl: "x" })),
        remove: mock(() => Promise.resolve()),
      },
      getBusinessById: mock(() => Promise.resolve({ id: "b1", logo: null })),
      updateLogo: mock(() => Promise.resolve(null)),
    }
    const result = await uploadBusinessLogo(deps, {
      businessId: "b1",
      role: "employee",
      file: {
        bytes: pngBytes(),
        contentType: "image/png",
        size: 64,
      },
    })
    expect(result.status).toBe(403)
  })

  test("rechaza tipo inválido", async () => {
    const result = await uploadBusinessLogo(
      {
        storage: {
          upload: mock(() => Promise.resolve({ publicUrl: "x" })),
          remove: mock(() => Promise.resolve()),
        },
        getBusinessById: mock(() => Promise.resolve({ id: "b1", logo: null })),
        updateLogo: mock(() => Promise.resolve(null)),
      },
      {
        businessId: "b1",
        role: "owner",
        file: {
          bytes: pngBytes(),
          contentType: "application/pdf",
          size: 64,
        },
      }
    )
    expect(result.status).toBe(400)
    expect(String((result.body as { error: string }).error)).toMatch(/imagen/i)
  })

  test("rechaza archivo demasiado grande", async () => {
    const result = await uploadBusinessLogo(
      {
        storage: {
          upload: mock(() => Promise.resolve({ publicUrl: "x" })),
          remove: mock(() => Promise.resolve()),
        },
        getBusinessById: mock(() => Promise.resolve({ id: "b1", logo: null })),
        updateLogo: mock(() => Promise.resolve(null)),
      },
      {
        businessId: "b1",
        role: "owner",
        file: {
          bytes: pngBytes(8),
          contentType: "image/png",
          size: MAX_LOGO_BYTES + 1,
        },
      }
    )
    expect(result.status).toBe(400)
    expect(String((result.body as { error: string }).error)).toMatch(/2/)
  })

  test("sube, actualiza DB y borra logo anterior del bucket", async () => {
    const oldUrl =
      "https://xxx.supabase.co/storage/v1/object/public/business-logos/b1/logo.jpg"
    const upload = mock(() =>
      Promise.resolve({
        publicUrl:
          "https://xxx.supabase.co/storage/v1/object/public/business-logos/b1/logo.png",
      })
    )
    const remove = mock(() => Promise.resolve())
    const updateLogo = mock(() =>
      Promise.resolve({
        id: "b1",
        name: "Biz",
        slug: "biz",
        logo: "https://xxx.supabase.co/storage/v1/object/public/business-logos/b1/logo.png",
        primary_color: "#F97316",
        secondary_color: "#FACC15",
        active_modules: ["loyalty"],
        points_needed: 10,
  point_ranges: [{ min_cents: 0, max_cents: null, points: 1 }],
        reward_name: "café",
      })
    )

    const result = await uploadBusinessLogo(
      {
        storage: { upload, remove },
        getBusinessById: mock(() =>
          Promise.resolve({ id: "b1", logo: oldUrl })
        ),
        updateLogo,
      },
      {
        businessId: "b1",
        role: "owner",
        file: {
          bytes: pngBytes(128),
          contentType: "image/png",
          size: 128,
        },
      }
    )

    expect(result.status).toBe(200)
    expect(upload).toHaveBeenCalledTimes(1)
    const [path, , contentType] = (upload as ReturnType<typeof mock>).mock
      .calls[0] as [string, Uint8Array, string]
    expect(path).toBe("b1/logo.png")
    expect(contentType).toBe("image/png")
    expect(updateLogo).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledWith("b1/logo.jpg")
    expect((result.body as { logo: string }).logo).toContain("logo.png")
  })

  test("sin logo previo no llama remove", async () => {
    const remove = mock(() => Promise.resolve())
    await uploadBusinessLogo(
      {
        storage: {
          upload: mock(() =>
            Promise.resolve({
              publicUrl:
                "https://xxx.supabase.co/storage/v1/object/public/business-logos/b1/logo.webp",
            })
          ),
          remove,
        },
        getBusinessById: mock(() =>
          Promise.resolve({ id: "b1", logo: null })
        ),
        updateLogo: mock(() =>
          Promise.resolve({
            id: "b1",
            name: "Biz",
            slug: "biz",
            logo: "u",
            primary_color: "#F97316",
            secondary_color: "#FACC15",
            active_modules: ["loyalty"],
            points_needed: 10,
  point_ranges: [{ min_cents: 0, max_cents: null, points: 1 }],
            reward_name: "café",
          })
        ),
      },
      {
        businessId: "b1",
        role: "owner",
        file: {
          bytes: pngBytes(),
          contentType: "image/webp",
          size: 64,
        },
      }
    )
    expect(remove).not.toHaveBeenCalled()
  })
})

describe("parseStoragePathFromPublicUrl", () => {
  test("extrae path del bucket", () => {
    expect(
      parseStoragePathFromPublicUrl(
        "https://abc.supabase.co/storage/v1/object/public/business-logos/b1/logo.png?v=1"
      )
    ).toBe("b1/logo.png")
  })

  test("null si no es del bucket", () => {
    expect(parseStoragePathFromPublicUrl("https://cdn.example/logo.png")).toBe(
      null
    )
  })
})

describe("ALLOWED_LOGO_TYPES", () => {
  test("jpeg png webp", () => {
    expect(ALLOWED_LOGO_TYPES["image/jpeg"]).toBe("jpg")
    expect(ALLOWED_LOGO_TYPES["image/png"]).toBe("png")
    expect(ALLOWED_LOGO_TYPES["image/webp"]).toBe("webp")
  })
})
