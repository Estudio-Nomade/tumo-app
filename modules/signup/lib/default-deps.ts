import type { SqlTagged } from "@/modules/admin/lib/types"
import { sql } from "@/shell/db/pool"
import { createBillingProvider } from "@/modules/signup/lib/provider"
import {
  appBaseUrl,
  isSelfServiceSignupEnabled,
} from "@/modules/signup/lib/flags"
import { getRegisteredModuleIds } from "@/lib/modules"

export const signupCheckoutDeps = {
  get sql() {
    return sql as unknown as SqlTagged
  },
  get provider() {
    return createBillingProvider()
  },
  get appBaseUrl() {
    return appBaseUrl()
  },
  get selfServiceEnabled() {
    return isSelfServiceSignupEnabled()
  },
  registeredModuleIds: () => getRegisteredModuleIds(),
}
