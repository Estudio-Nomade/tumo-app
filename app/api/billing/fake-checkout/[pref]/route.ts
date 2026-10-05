import { NextResponse } from "next/server"
import type { SqlTagged } from "@/modules/admin/lib/types"
import { sql } from "@/shell/db/pool"
import { createFakeMercadoPagoProvider } from "@/shell/billing/provider/fake"
import { applyProviderEvent } from "@/shell/billing/checkout/apply-event"
import { isSelfServiceSignupEnabled } from "@/modules/signup/lib/flags"

/**
 * Local-only fake MP checkout page.
 * GET ?ext=sessionId → form that POSTs approved webhook-like event.
 */
export async function GET(req: Request) {
  if (!isSelfServiceSignupEnabled()) {
    return NextResponse.json({ error: "off" }, { status: 403 })
  }
  const url = new URL(req.url)
  const ext = url.searchParams.get("ext") ?? ""
  const pref = url.pathname.split("/").pop() ?? "pref"
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Pago demo Tumo</title>
<style>
body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.card{background:#171717;border:1px solid #333;border-radius:16px;padding:24px;max-width:420px;width:92%}
h1{font-size:1.25rem;margin:0 0 8px}p{color:#a3a3a3;line-height:1.4}
button{width:100%;min-height:52px;border:0;border-radius:999px;font-weight:700;font-size:1rem;cursor:pointer;margin-top:12px}
.ok{background:#7754E3;color:#fff}.fail{background:#262626;color:#fff;border:1px solid #444}
code{font-size:12px;color:#c4b5fd}
</style></head><body><div class="card">
<h1>Checkout demo (fake MP)</h1>
<p>Simula el pago de Mercado Pago en local. Session: <code>${escapeHtml(ext || "—")}</code></p>
<form method="POST">
<input type="hidden" name="ext" value="${escapeAttr(ext)}"/>
<input type="hidden" name="pref" value="${escapeAttr(pref)}"/>
<button class="ok" name="result" value="approved" type="submit">Pagar OK (demo)</button>
<button class="fail" name="result" value="rejected" type="submit">Fallar pago</button>
</form>
</div></body></html>`
  return new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  })
}

export async function POST(req: Request) {
  if (!isSelfServiceSignupEnabled()) {
    return NextResponse.json({ error: "off" }, { status: 403 })
  }
  const form = await req.formData()
  const ext = String(form.get("ext") ?? "")
  const result = String(form.get("result") ?? "approved")
  const provider = createFakeMercadoPagoProvider()
  const event = await provider.parseAndVerifyWebhook(
    JSON.stringify({
      id: `pay_fake_${Date.now()}`,
      status: result === "approved" ? "approved" : "rejected",
      external_reference: ext,
    }),
    {}
  )
  const apply = await applyProviderEvent(
    {
      sql: sql as unknown as SqlTagged,
      providerName: "mercadopago",
      now: () => new Date(),
    },
    event
  )

  const base =
    process.env.APP_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  const continueUrl = new URL(`${base}/signup/continue`)
  continueUrl.searchParams.set("session", ext)
  if (result !== "approved") continueUrl.searchParams.set("result", "failure")
  if (apply.status === 400 || apply.status === 404 || apply.status === 500) {
    continueUrl.searchParams.set("error", apply.body.code)
  }
  return NextResponse.redirect(continueUrl.toString(), 303)
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
function escapeAttr(s: string) {
  return escapeHtml(s).replace(/'/g, "&#39;")
}
