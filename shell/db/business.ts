import type { Business } from "@/lib/modules"
import type { BusinessBrandPatch } from "@/shell/business/update"
import type { ProgramPatch } from "@/modules/loyalty/api/program"
import {
  shouldPersistVencido,
  type TenantBillingStatus,
} from "@/shell/billing/access"
import { sql } from "./pool"

type BusinessRow = Business & {
  billing_status?: TenantBillingStatus | null
  billing_next_due_at?: Date | string | null
}

function mapBusiness(row: BusinessRow | undefined): Business | null {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo,
    primary_color: row.primary_color,
    secondary_color: row.secondary_color,
    surface_color: row.surface_color,
    tagline: row.tagline,
    active_modules: row.active_modules,
    points_needed: row.points_needed,
    reward_name: row.reward_name,
    point_ranges: row.point_ranges,
    billing_status: row.billing_status ?? null,
    billing_next_due_at: row.billing_next_due_at ?? null,
  }
}

async function maybeMarkVencido(business: Business): Promise<Business> {
  if (
    !shouldPersistVencido(
      {
        status: business.billing_status,
        next_due_at: business.billing_next_due_at,
      },
      new Date()
    )
  ) {
    return business
  }

  await sql`
    UPDATE business_billing
    SET status = ${"vencido"}, updated_at = now()
    WHERE business_id = ${business.id}
      AND status IS DISTINCT FROM ${"vencido"}
  `

  return { ...business, billing_status: "vencido" }
}

async function selectBusiness(
  where: "slug" | "id",
  value: string
): Promise<Business | null> {
  const rows =
    where === "slug"
      ? await sql<BusinessRow[]>`
          SELECT
            b.id,
            b.name,
            b.slug,
            b.logo,
            b.primary_color,
            b.secondary_color,
            b.surface_color,
            b.tagline,
            b.active_modules,
            b.points_needed,
            b.reward_name,
            b.point_ranges,
            bb.status AS billing_status,
            bb.next_due_at AS billing_next_due_at
          FROM businesses b
          LEFT JOIN business_billing bb ON bb.business_id = b.id
          WHERE b.slug = ${value}
          LIMIT 1
        `
      : await sql<BusinessRow[]>`
          SELECT
            b.id,
            b.name,
            b.slug,
            b.logo,
            b.primary_color,
            b.secondary_color,
            b.surface_color,
            b.tagline,
            b.active_modules,
            b.points_needed,
            b.reward_name,
            b.point_ranges,
            bb.status AS billing_status,
            bb.next_due_at AS billing_next_due_at
          FROM businesses b
          LEFT JOIN business_billing bb ON bb.business_id = b.id
          WHERE b.id = ${value}
          LIMIT 1
        `

  const business = mapBusiness(rows[0])
  if (!business) return null
  return maybeMarkVencido(business)
}

export async function getBusiness(slug: string): Promise<Business | null> {
  return selectBusiness("slug", slug)
}

export async function getBusinessById(id: string): Promise<Business | null> {
  return selectBusiness("id", id)
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

  await sql`
    UPDATE businesses
    SET
      name = ${name},
      primary_color = ${primary_color},
      secondary_color = ${secondary_color}
    WHERE id = ${businessId}
  `

  return getBusinessById(businessId)
}

export async function updateBusinessLogo(
  businessId: string,
  logoUrl: string
): Promise<Business | null> {
  await sql`
    UPDATE businesses
    SET logo = ${logoUrl}
    WHERE id = ${businessId}
  `

  return getBusinessById(businessId)
}

export async function updateBusinessProgram(
  businessId: string,
  patch: ProgramPatch
): Promise<Business | null> {
  const current = await getBusinessById(businessId)
  if (!current) return null

  const points_needed = patch.points_needed ?? current.points_needed
  const reward_name = patch.reward_name ?? current.reward_name
  const point_ranges = patch.point_ranges ?? current.point_ranges

  await sql`
    UPDATE businesses
    SET
      points_needed = ${points_needed},
      reward_name = ${reward_name},
      point_ranges = ${sql.json(point_ranges as never)}
    WHERE id = ${businessId}
  `

  return getBusinessById(businessId)
}
