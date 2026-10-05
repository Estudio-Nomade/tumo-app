import { NextResponse } from "next/server"
import { postSignupCheckout } from "@/modules/signup/api/checkout"
import { signupCheckoutDeps } from "@/modules/signup/lib/default-deps"

export async function POST(req: Request) {
  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const moduleIds = Array.isArray(body.moduleIds)
    ? body.moduleIds.map(String)
    : typeof body.moduleIds === "string"
      ? [body.moduleIds]
      : []

  const result = await postSignupCheckout(signupCheckoutDeps, {
    email: typeof body.email === "string" ? body.email : "",
    password: typeof body.password === "string" ? body.password : "",
    businessName: typeof body.businessName === "string" ? body.businessName : "",
    payerName: typeof body.payerName === "string" ? body.payerName : "",
    payerDocument:
      typeof body.payerDocument === "string" ? body.payerDocument : undefined,
    planId: typeof body.planId === "string" ? body.planId : "",
    moduleIds,
  })

  return NextResponse.json(result.body, { status: result.status })
}
