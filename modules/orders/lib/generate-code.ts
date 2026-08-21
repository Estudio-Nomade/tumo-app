/** Código de cliente de 4 dígitos (mismo formato que el de fidelización). */
export function generateCustomerCode(): string {
  const n = 1000 + Math.floor(Math.random() * 9000)
  return String(n)
}
