import type { SqlTagged } from "@/modules/admin/lib/types"
import {
  startCheckout,
  type StartCheckoutDeps,
} from "@/shell/billing/checkout/start"
import type { PaymentProvider } from "@/shell/billing/provider/types"

export type PostSignupCheckoutDeps = {
  sql: SqlTagged
  provider: PaymentProvider
  appBaseUrl: string
  selfServiceEnabled: boolean
  newId?: StartCheckoutDeps["newId"]
  hashPassword?: StartCheckoutDeps["hashPassword"]
  now?: StartCheckoutDeps["now"]
  registeredModuleIds?: StartCheckoutDeps["registeredModuleIds"]
}

export async function postSignupCheckout(
  deps: PostSignupCheckoutDeps,
  body: {
    email?: string
    password?: string
    businessName?: string
    payerName?: string
    payerDocument?: string
    planId?: string
    moduleIds?: string[]
  }
) {
  if (!deps.selfServiceEnabled) {
    return {
      status: 403 as const,
      body: {
        error: "Alta self-service deshabilitada.",
        code: "self_service_off",
      },
    }
  }

  return startCheckout(
    {
      sql: deps.sql,
      provider: deps.provider,
      appBaseUrl: deps.appBaseUrl,
      newId: deps.newId,
      hashPassword: deps.hashPassword,
      now: deps.now,
      registeredModuleIds: deps.registeredModuleIds,
    },
    {
      email: body.email ?? "",
      password: body.password ?? "",
      businessName: body.businessName ?? "",
      payerName: body.payerName ?? "",
      payerDocument: body.payerDocument,
      planId: body.planId ?? "",
      moduleIds: body.moduleIds ?? [],
    }
  )
}
