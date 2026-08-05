import { sql } from "./pool"

async function seed() {
  const [business] = await sql`
    INSERT INTO businesses (
      name,
      slug,
      primary_color,
      secondary_color,
      active_modules,
      purchases_needed,
      reward_name
    )
    VALUES (
      ${"El Auténtico Carri"},
      ${"carri"},
      ${"#F97316"},
      ${"#FACC15"},
      ${"{loyalty}"},
      ${10},
      ${"hamburguesa gratis"}
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      primary_color = EXCLUDED.primary_color,
      secondary_color = EXCLUDED.secondary_color,
      active_modules = EXCLUDED.active_modules,
      purchases_needed = EXCLUDED.purchases_needed,
      reward_name = EXCLUDED.reward_name
    RETURNING id, name, slug
  `

  await sql`
    INSERT INTO employees (name, phone, role, business_id)
    SELECT ${"Nobel"}, ${"+542494512494"}, ${"owner"}, ${business.id}
    WHERE NOT EXISTS (
      SELECT 1 FROM employees
      WHERE phone = ${"+542494512494"} AND business_id = ${business.id}
    )
  `

  await sql`
    INSERT INTO employees (name, phone, role, business_id)
    SELECT ${"Juan Pérez"}, ${"+5491187654321"}, ${"employee"}, ${business.id}
    WHERE NOT EXISTS (
      SELECT 1 FROM employees
      WHERE phone = ${"+5491187654321"} AND business_id = ${business.id}
    )
  `

  console.log("Seed OK:", business)
}

seed()
  .then(async () => {
    await sql.end()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error(e)
    await sql.end({ timeout: 5 })
    process.exit(1)
  })
