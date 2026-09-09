import { sql } from "./pool"
import { monthlyAmountCentsForModuleCount } from "../billing/pricing"

async function seedDefe() {
  const [business] = await sql`
    INSERT INTO businesses (
      name,
      slug,
      primary_color,
      secondary_color,
      surface_color,
      tagline,
      active_modules,
      points_needed,
      reward_name
    )
    VALUES (
      ${"El Defe Cantina"},
      ${"defe"},
      ${"#577e99"},
      ${"#84a7c2"},
      ${"#e7f4f8"},
      ${"Club Defensores de Belgrano · Desde 1950"},
      ${"{loyalty}"},
      ${10},
      ${"hamburguesa gratis"}
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      primary_color = EXCLUDED.primary_color,
      secondary_color = EXCLUDED.secondary_color,
      surface_color = EXCLUDED.surface_color,
      tagline = EXCLUDED.tagline,
      active_modules = EXCLUDED.active_modules,
      points_needed = EXCLUDED.points_needed,
      reward_name = EXCLUDED.reward_name
    RETURNING id, name, slug, primary_color, secondary_color, surface_color, tagline
  `

  console.log("INSERT OK:", business)

  const defeMonthly = monthlyAmountCentsForModuleCount(1)
  const seedNow = new Date()

  await sql`
    INSERT INTO business_module_subscriptions (
      business_id,
      module_id,
      status,
      activated_at,
      billing_anchor_at,
      updated_at
    )
    VALUES (
      ${business.id},
      ${"loyalty"},
      ${"active"},
      ${seedNow},
      ${seedNow},
      ${seedNow}
    )
    ON CONFLICT (business_id, module_id) DO UPDATE SET
      status = ${"active"},
      deactivated_at = ${null},
      updated_at = ${seedNow}
  `

  await sql`
    INSERT INTO business_billing (
      business_id,
      monthly_amount_cents,
      status,
      updated_at
    )
    VALUES (
      ${business.id},
      ${defeMonthly},
      ${"vencido"},
      ${new Date()}
    )
    ON CONFLICT (business_id) DO UPDATE SET
      status = ${"vencido"},
      monthly_amount_cents = ${defeMonthly},
      updated_at = ${new Date()}
  `

  const rows = await sql`
    SELECT id, name, slug, primary_color, secondary_color, surface_color, tagline, active_modules
    FROM businesses
    WHERE slug = ${"defe"}
  `
  console.log("VERIFY:", rows)
}

seedDefe()
  .then(async () => {
    await sql.end()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error(e)
    await sql.end({ timeout: 5 })
    process.exit(1)
  })
