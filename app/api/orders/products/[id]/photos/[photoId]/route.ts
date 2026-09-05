import { NextResponse, type NextRequest } from "next/server"
import { removeProductPhoto } from "@/modules/orders/api/product-photos"
import { productsDeps } from "@/modules/orders/lib/default-deps"
import { validateSession } from "@/shell/auth/session"
import {
  createSupabaseProductPhotoStorage,
  isSupabaseStorageConfigured,
} from "@/shell/storage/supabase"
import type { ProductPhotoStorage } from "@/modules/orders/api/product-photos"

type Params = { params: Promise<{ id: string; photoId: string }> }

const noopStorage: ProductPhotoStorage = {
  upload: async () => {
    throw new Error("storage noop")
  },
  remove: async () => {},
}

async function sessionOf(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value
  if (!token) return null
  return validateSession(token)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, photoId } = await params

  const session = await sessionOf(req)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  const storage = isSupabaseStorageConfigured()
    ? createSupabaseProductPhotoStorage()
    : noopStorage

  const result = await removeProductPhoto(
    {
      sql: productsDeps.sql,
      storage,
    },
    {
      productId: id,
      businessId: session.businessId,
      photoId,
    }
  )

  return NextResponse.json(result.body, { status: result.status })
}
