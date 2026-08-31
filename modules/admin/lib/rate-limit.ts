const SEND_COOLDOWN_MS = 60_000
const VERIFY_WINDOW_MS = 5 * 60_000
const VERIFY_MAX = 5

const lastSend = new Map<string, number>()
const verifyAttempts = new Map<string, number[]>()

function key(phone: string): string {
  return `admin:${phone}`
}

export function canSendCode(phone: string): boolean {
  const t = lastSend.get(key(phone))
  if (t == null) return true
  return Date.now() - t >= SEND_COOLDOWN_MS
}

export function recordSend(phone: string): void {
  lastSend.set(key(phone), Date.now())
}

export function resetVerifyAttempts(phone: string): void {
  verifyAttempts.delete(key(phone))
}

export function canVerify(phone: string): boolean {
  const k = key(phone)
  const now = Date.now()
  const times = (verifyAttempts.get(k) ?? []).filter(
    (t) => now - t < VERIFY_WINDOW_MS
  )
  verifyAttempts.set(k, times)
  return times.length < VERIFY_MAX
}

export function recordVerifyAttempt(phone: string): void {
  const k = key(phone)
  const times = verifyAttempts.get(k) ?? []
  times.push(Date.now())
  verifyAttempts.set(k, times)
}

export function _resetAdminRateLimitForTests(): void {
  lastSend.clear()
  verifyAttempts.clear()
}
