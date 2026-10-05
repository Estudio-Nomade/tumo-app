import { NextResponse } from "next/server"
import type { SqlTagged } from "@/modules/admin/lib/types"
import { sql } from "@/shell/db/pool"
import { isSelfServiceSignupEnabled } from "@/modules/signup/lib/flags"

export async function GET(req: Request) {
  if (!isSelfServiceSignupEnabled()) {
    return NextResponse.json(
      { error: "Alta self-service deshabilitada.", code: "self_service_off" },
      { status: 403 }
    )
  }
  const id = new URL(req.url).searchParams.get("id")?.trim() ?? ""
  if (!id) {
    return NextResponse.json({ error: "id requerido." }, { status: 400 })
  }
  const rows = (await (sql as unknown as SqlTagged)`
    SELECT id, status, email, business_name, plan_id, module_ids, business_id,
           amount_cents, currency, provision_error
    FROM checkout_sessions
    WHERE id = ${id}
    LIMIT 1
  `) as {
    id: string
    status: string
    email: string
    business_name: string
    plan_id: string
    module_ids: string[]
    business_id: string | null
    amount_cents: number
    currency: string
    provision_error: string | null
  }[]

  const row = rows[0]
  if (!row) {
    return NextResponse.json({ error: "No encontrada." }, { status: 404 })
  }

  let slug: string | null = null
  if (row.business_id) {
    const b = (await (sql as unknown as SqlTagged)`
      SELECT slug FROM businesses WHERE id = ${row.business_id} LIMIT 1
    `) as { slug: string }[]
    slug = b[0]?.slug ?? null
  }

  return NextResponse.json({
    id: row.id,
    status: row.status,
    email: row.email,
    business_name: row.business_name,
    plan_id: row.plan_id,
    module_ids: row.module_ids,
    business_id: row.business_id,
    amount_cents: row.amount_cents,
    currency: row.currency,
    provision_error: row.provision_error,
    slug,
  })
}
