import type { Business } from "@/lib/modules"
import { sql } from "./pool"

export async function getBusiness(slug: string): Promise<Business | null> {
  const [business] = await sql<Business[]>`
    SELECT
      id,
      name,
      slug,
      logo,
      primary_color,
      secondary_color,
      active_modules,
      purchases_needed,
      reward_name
    FROM businesses
    WHERE slug = ${slug}
    LIMIT 1
  `

  return business ?? null
}

export async function getBusinessById(id: string): Promise<Business | null> {
  const [business] = await sql<Business[]>`
    SELECT
      id,
      name,
      slug,
      logo,
      primary_color,
      secondary_color,
      active_modules,
      purchases_needed,
      reward_name
    FROM businesses
    WHERE id = ${id}
    LIMIT 1
  `

  return business ?? null
}
