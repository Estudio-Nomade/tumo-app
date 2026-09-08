import { normalizePhone, phonesMatch } from "@/lib/phone"
import type { AdminSessionUser, SqlTagged } from "@/modules/admin/lib/types"
import { ADMIN_SESSION_MAX_AGE } from "@/modules/admin/lib/types"

export async function findAdminUserByPhone(
  phone: string,
  db: SqlTagged
): Promise<AdminSessionUser | null> {
  const digits = normalizePhone(phone)
  if (!digits) return null
  const rows = (await db`
    SELECT id, phone, name FROM admin_users
  `) as AdminSessionUser[]
  const exact = rows.find((row) => normalizePhone(row.phone) === digits)
  if (exact) return exact
  return rows.find((row) => phonesMatch(digits, row.phone)) ?? null
}

export async function createAdminSession(
  adminUserId: string,
  db: SqlTagged
): Promise<string> {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_MAX_AGE * 1000)
  await db`
    INSERT INTO admin_sessions (admin_user_id, token, expires_at)
    VALUES (${adminUserId}, ${token}, ${expiresAt})
  `
  return token
}

export async function validateAdminSession(
  token: string,
  db: SqlTagged
): Promise<AdminSessionUser | null> {
  if (!token?.trim()) return null
  const rows = (await db`
    SELECT
      u.id,
      u.phone,
      u.name
    FROM admin_sessions s
    JOIN admin_users u ON u.id = s.admin_user_id
    WHERE s.token = ${token} AND s.expires_at > now()
    LIMIT 1
  `) as AdminSessionUser[]
  return rows[0] ?? null
}

export async function deleteAdminSession(
  token: string,
  db: SqlTagged
): Promise<void> {
  await db`
    DELETE FROM admin_sessions WHERE token = ${token}
  `
}

