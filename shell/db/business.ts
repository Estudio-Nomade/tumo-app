import type { Business } from "@/lib/modules"
import type { BusinessBrandPatch } from "@/shell/business/update"
import type { ProgramPatch } from "@/modules/loyalty/api/program"
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
      surface_color,
      tagline,
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
      surface_color,
      tagline,
      active_modules,
      purchases_needed,
      reward_name
    FROM businesses
    WHERE id = ${id}
    LIMIT 1
  `

  return business ?? null
}

export async function updateBusinessBrand(
  businessId: string,
  patch: BusinessBrandPatch
): Promise<Business | null> {
  const current = await getBusinessById(businessId)
  if (!current) return null

  const name = patch.name ?? current.name
  const primary_color = patch.primary_color ?? current.primary_color
  const secondary_color = patch.secondary_color ?? current.secondary_color

  const [business] = await sql<Business[]>`
    UPDATE businesses
    SET
      name = ${name},
      primary_color = ${primary_color},
      secondary_color = ${secondary_color}
    WHERE id = ${businessId}
    RETURNING
      id,
      name,
      slug,
      logo,
      primary_color,
      secondary_color,
      surface_color,
      tagline,
      active_modules,
      purchases_needed,
      reward_name
  `

  return business ?? null
}

export async function updateBusinessLogo(
  businessId: string,
  logoUrl: string
): Promise<Business | null> {
  const [business] = await sql<Business[]>`
    UPDATE businesses
    SET logo = ${logoUrl}
    WHERE id = ${businessId}
    RETURNING
      id,
      name,
      slug,
      logo,
      primary_color,
      secondary_color,
      surface_color,
      tagline,
      active_modules,
      purchases_needed,
      reward_name
  `

  return business ?? null
}

export async function updateBusinessProgram(
  businessId: string,
  patch: ProgramPatch
): Promise<Business | null> {
  const current = await getBusinessById(businessId)
  if (!current) return null

  const purchases_needed = patch.purchases_needed ?? current.purchases_needed
  const reward_name = patch.reward_name ?? current.reward_name

  const [business] = await sql<Business[]>`
    UPDATE businesses
    SET
      purchases_needed = ${purchases_needed},
      reward_name = ${reward_name}
    WHERE id = ${businessId}
    RETURNING
      id,
      name,
      slug,
      logo,
      primary_color,
      secondary_color,
      surface_color,
      tagline,
      active_modules,
      purchases_needed,
      reward_name
  `

  return business ?? null
}
