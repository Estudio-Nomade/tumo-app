import { TOOLS } from "@/modules/landing/config"

const SIGNUP_MODULE_IDS = ["loyalty", "orders", "turnos"] as const

export type SignupModuleId = (typeof SIGNUP_MODULE_IDS)[number]

export type SignupModuleOption = {
  id: SignupModuleId
  title: string
  description: string
}

/** Copy de módulos seleccionables — SoT = TOOLS de landing (sin custom). */
export const MODULE_OPTIONS: SignupModuleOption[] = SIGNUP_MODULE_IDS.map(
  (id) => {
    const tool = TOOLS.find((t) => t.id === id)
    return {
      id,
      title: tool?.title ?? id,
      description: tool?.description ?? "",
    }
  }
)

export const ALL_MODULE_IDS: SignupModuleId[] = MODULE_OPTIONS.map((m) => m.id)
