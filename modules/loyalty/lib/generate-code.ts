export function generateLoyaltyCode(): string {
  const n = 1000 + Math.floor(Math.random() * 9000)
  return String(n)
}
