export type SqlTagged = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown[]>

export type CustomerRow = {
  id: string
  name: string
  phone: string
  code: string
  purchases: number
  total_purchases: number
  business_id: string
}

export type JsonResult = {
  status: number
  body: Record<string, unknown>
}
