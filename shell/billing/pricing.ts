/** Centavos USD. Alineado a landing PRICE_PER_MODULE_USD = "69.99". */
export const PRICE_PER_MODULE_CENTS = 6999

export function monthlyAmountCentsForModuleCount(moduleCount: number): number {
  const n = Number.isFinite(moduleCount) ? Math.max(0, Math.floor(moduleCount)) : 0
  return n * PRICE_PER_MODULE_CENTS
}
