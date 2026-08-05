import { normalizePhone } from "@/lib/phone"
import { sql as defaultSql } from "./pool"

export type Employee = {
  id: string
  name: string
  phone: string
  role: string
  business_id: string
}

type SqlTagged = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Employee[]>

export async function getEmployeeByPhone(
  phone: string,
  businessId: string,
  db: SqlTagged = defaultSql as unknown as SqlTagged
): Promise<Employee | null> {
  const digits = normalizePhone(phone)
  if (!digits) return null

  const [employee] = await db`
    SELECT id, name, phone, role, business_id
    FROM employees
    WHERE business_id = ${businessId}
      AND regexp_replace(phone, '[^0-9]', '', 'g') = ${digits}
    LIMIT 1
  `

  return employee ?? null
}
