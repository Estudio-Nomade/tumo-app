import { NextResponse, type NextRequest } from "next/server"
import {
  addProductPhoto,
  listProductPhotos,
} from "@/modules/orders/api/product-photos"
import { productsDeps } from "@/modules/orders/lib/default-deps"
import { validateSession } from "@/shell/auth/session"
import {
  createSupabaseProductPhotoStorage,
  isSupabaseStorageConfigured,
} from "@/shell/storage/supabase"

type Params = { params: Promise<{ id: string }> }

async function sessionOf(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value
  if (!token) return null
  return validateSession(token)
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await sessionOf(req)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  const result = await listProductPhotos(
    {
      sql: productsDeps.sql,
      storage: {
        upload: async () => {
          throw new Error("storage noop")
        },
        remove: async () => {},
      },
    },
    { productId: id, businessId: session.businessId }
  )
  return NextResponse.json(result.body, { status: result.status })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params

  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Storage no configurado. Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.",
      },
      { status: 503 }
    )
  }

  const session = await sessionOf(req)
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Formulario inválido." }, { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Falta el archivo de imagen." },
      { status: 400 }
    )
  }

  const buffer = new Uint8Array(await file.arrayBuffer())
  const contentType = file.type || "application/octet-stream"

  const result = await addProductPhoto(
    {
      sql: productsDeps.sql,
      storage: createSupabaseProductPhotoStorage(),
    },
    {
      productId: id,
      businessId: session.businessId,
      file: {
        bytes: buffer,
        contentType,
        size: file.size,
      },
    }
  )

  return NextResponse.json(result.body, { status: result.status })
}
