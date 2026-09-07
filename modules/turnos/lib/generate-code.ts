/** Código de cliente de 4 dígitos (mismo formato loyalty/orders). */
export function generateTurnosCustomerCode(): string {
  const n = 1000 + Math.floor(Math.random() * 9000)
  return String(n)
}
