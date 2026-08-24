/**
 * Umbral a partir del cual avisamos al cliente que el pago por MercadoPago
 * está tardando más de lo normal.
 */
export const MP_SLOW_AFTER_MS = 45_000

/**
 * Mensaje "está tardando" para el estado pendiente de MercadoPago, o `null`
 * si todavía está dentro de un tiempo normal. Lenguaje llano (elderly-UX).
 */
export function mpTimeoutHint(
  elapsedMs: number,
  slowAfterMs: number = MP_SLOW_AFTER_MS
): string | null {
  if (elapsedMs >= slowAfterMs) {
    return "Está tardando más de lo normal. Podés esperar o revisar el estado."
  }
  return null
}
