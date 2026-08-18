export type SqlTagged = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown[]>) & {
  begin?: <T>(fn: (sql: SqlTagged) => Promise<T>) => Promise<T>
}

export type PointRange = {
  min_cents: number
  max_cents: number | null
  points: number
}

export type CustomerRow = {
  id: string
  name: string
  phone: string
  code: string
  points: number
  total_points: number
  business_id: string
}

export type JsonResult = {
  status: number
  body: Record<string, unknown>
}

export function rangeLabel(band: PointRange): string {
  const min = Math.floor(band.min_cents / 100)
  if (band.max_cents == null) return `${min}+`
  const max = Math.floor(band.max_cents / 100)
  return `${min}–${max}`
}

export async function withTransaction<T>(
  sql: SqlTagged,
  fn: (tx: SqlTagged) => Promise<T>
): Promise<T> {
  if (typeof sql.begin === "function") {
    return sql.begin(fn)
  }
  return fn(sql)
}
