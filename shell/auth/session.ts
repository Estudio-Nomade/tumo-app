import { sql as defaultSql } from "@/shell/db/pool"

export type SessionEmployee = {
  id: string
  name: string
  phone: string
  role: string
  businessId: string
}

type SqlTagged = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown[]>

export async function createSession(
  employeeId: string,
  db: SqlTagged = defaultSql as unknown as SqlTagged
): Promise<string> {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await db`
    INSERT INTO sessions (employee_id, token, expires_at)
    VALUES (${employeeId}, ${token}, ${expiresAt})
  `

  return token
}

export async function validateSession(
  token: string,
  db: SqlTagged = defaultSql as unknown as SqlTagged
): Promise<SessionEmployee | null> {
  const rows = (await db`
    SELECT
      e.id,
      e.name,
      e.phone,
      e.role,
      e.business_id AS "businessId"
    FROM sessions s
    JOIN employees e ON e.id = s.employee_id
    WHERE s.token = ${token} AND s.expires_at > now()
    LIMIT 1
  `) as SessionEmployee[]

  return rows[0] ?? null
}

export async function deleteSession(
  token: string,
  db: SqlTagged = defaultSql as unknown as SqlTagged
): Promise<void> {
  await db`
    DELETE FROM sessions WHERE token = ${token}
  `
}
