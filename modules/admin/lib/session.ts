import type { AdminSessionUser, SqlTagged } from "@/modules/admin/lib/types"
import { ADMIN_SESSION_MAX_AGE } from "@/modules/admin/lib/types"

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

export async function upsertAdminUser(
  phoneDigits: string,
  name: string | null,
  db: SqlTagged
): Promise<AdminSessionUser> {
  const rows = (await db`
    INSERT INTO admin_users (phone, name)
    VALUES (${phoneDigits}, ${name})
    ON CONFLICT (phone) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, admin_users.name)
    RETURNING id, phone, name
  `) as AdminSessionUser[]
  return rows[0]
}
