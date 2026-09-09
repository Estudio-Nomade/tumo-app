export type ModuleSubscriptionSnapshot = {
  module_id: string
  status: string
  activated_at: string | null
  billing_anchor_at: string | null
  deactivated_at: string | null
}

/** Reemplaza o inserta una fila de suscripción (respuesta activate/patch/deactivate). */
export function upsertModuleSubscription(
  list: ModuleSubscriptionSnapshot[],
  next: ModuleSubscriptionSnapshot
): ModuleSubscriptionSnapshot[] {
  const i = list.findIndex((s) => s.module_id === next.module_id)
  if (i < 0) return [...list, next]
  const copy = list.slice()
  copy[i] = next
  return copy
}

/**
 * Estado de UI del detail admin a partir del business del server.
 * Evita useState “congelado” tras router.refresh() con nuevas fechas.
 */
export function syncDetailModuleState(input: {
  active_modules: string[]
  module_subscriptions?: ModuleSubscriptionSnapshot[] | null
  /** ignorado a propósito: la fuente de verdad es el business fresco */
  previousSubscriptions?: ModuleSubscriptionSnapshot[]
}): {
  modules: string[]
  subscriptions: ModuleSubscriptionSnapshot[]
} {
  void input.previousSubscriptions
  return {
    modules: [...(input.active_modules ?? [])],
    subscriptions: [...(input.module_subscriptions ?? [])],
  }
}
