import { NextResponse } from "next/server"
import type { SqlTagged } from "@/modules/admin/lib/types"
import { handleMercadoPagoWebhook } from "@/shell/billing/checkout/handle-webhook"
import { createBillingProvider } from "@/modules/signup/lib/provider"
import { sql } from "@/shell/db/pool"
import { isSelfServiceSignupEnabled } from "@/modules/signup/lib/flags"

/** GET = MP panel probe / health. */
export async function GET() {
  return NextResponse.json({ ok: true, provider: "mercadopago" })
}

export async function POST(req: Request) {
  if (!isSelfServiceSignupEnabled()) {
    return NextResponse.json({ error: "off" }, { status: 403 })
  }
  const rawBody = await req.text()
  const provider = createBillingProvider()
  const result = await handleMercadoPagoWebhook(
    {
      sql: sql as unknown as SqlTagged,
      provider,
      providerName: "mercadopago",
    },
    { rawBody, headers: req.headers }
  )
  return NextResponse.json(result.body, { status: result.status })
}
