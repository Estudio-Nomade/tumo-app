import { normalizePhone } from "@/lib/phone"

type SendEntry = { lastSentAt: number }
type VerifyEntry = { attempts: number; windowStart: number }

const sendMap = new Map<string, SendEntry>()
const verifyMap = new Map<string, VerifyEntry>()

const SEND_COOLDOWN_MS = 60_000
const VERIFY_WINDOW_MS = 5 * 60_000
const VERIFY_MAX_ATTEMPTS = 5

function key(phone: string, slug: string) {
  return `${normalizePhone(phone)}:${slug}`
}

export function canSendCode(phone: string, slug: string, now = Date.now()): boolean {
  const entry = sendMap.get(key(phone, slug))
  if (!entry) return true
  return now - entry.lastSentAt >= SEND_COOLDOWN_MS
}

export function recordSend(phone: string, slug: string, now = Date.now()): void {
  sendMap.set(key(phone, slug), { lastSentAt: now })
}

export function canVerify(phone: string, slug: string, now = Date.now()): boolean {
  const entry = verifyMap.get(key(phone, slug))
  if (!entry) return true
  if (now - entry.windowStart >= VERIFY_WINDOW_MS) return true
  return entry.attempts < VERIFY_MAX_ATTEMPTS
}

export function recordVerifyAttempt(
  phone: string,
  slug: string,
  now = Date.now()
): void {
  const k = key(phone, slug)
  const entry = verifyMap.get(k)
  if (!entry || now - entry.windowStart >= VERIFY_WINDOW_MS) {
    verifyMap.set(k, { attempts: 1, windowStart: now })
    return
  }
  entry.attempts += 1
}

export function resetVerifyAttempts(phone: string, slug: string): void {
  verifyMap.delete(key(phone, slug))
}

export function _resetAllForTests(): void {
  sendMap.clear()
  verifyMap.clear()
}
