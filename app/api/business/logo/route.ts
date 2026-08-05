import { NextResponse, type NextRequest } from "next/server"
import { validateSession } from "@/shell/auth/session"
import { uploadBusinessLogo } from "@/shell/business/logo"
import { getBusinessById, updateBusinessLogo } from "@/shell/db/business"
import {
  createSupabaseLogoStorage,
  isSupabaseStorageConfigured,
} from "@/shell/storage/supabase"

export async function POST(req: NextRequest) {
  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Storage no configurado. Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.",
      },
      { status: 503 }
    )
  }

  const token = req.cookies.get("session_token")?.value
  if (!token) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  const session = await validateSession(token)
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

  const result = await uploadBusinessLogo(
    {
      storage: createSupabaseLogoStorage(),
      getBusinessById: async (id) => {
        const b = await getBusinessById(id)
        return b ? { id: b.id, logo: b.logo } : null
      },
      updateLogo: updateBusinessLogo,
    },
    {
      businessId: session.businessId,
      role: session.role,
      file: {
        bytes: buffer,
        contentType,
        size: file.size,
      },
    }
  )

  return NextResponse.json(result.body, { status: result.status })
}
