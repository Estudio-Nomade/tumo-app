import { sql } from "./pool"

async function seed() {
  const [business] = await sql`
    INSERT INTO businesses (
      name,
      slug,
      primary_color,
      secondary_color,
      active_modules,
      points_needed,
      reward_name
    )
    VALUES (
      ${"El Auténtico Carri"},
      ${"carri"},
      ${"#F97316"},
      ${"#FACC15"},
      ${"{loyalty,orders}"},
      ${10},
      ${"hamburguesa gratis"}
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      primary_color = EXCLUDED.primary_color,
      secondary_color = EXCLUDED.secondary_color,
      active_modules = EXCLUDED.active_modules,
      points_needed = EXCLUDED.points_needed,
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

  // --- Módulo de pedidos: catálogo + settings de Carri ---

  const categories = [
    ["a1000000-0000-4000-8000-000000000001", "Hamburguesas", 0],
    ["a1000000-0000-4000-8000-000000000002", "Lomitos", 1],
    ["a1000000-0000-4000-8000-000000000003", "Papas", 2],
    ["a1000000-0000-4000-8000-000000000004", "Bebidas", 3],
  ] as const
  for (const [id, name, sort] of categories) {
    await sql`
      INSERT INTO product_categories (id, business_id, name, sort_order)
      VALUES (${id}, ${business.id}, ${name}, ${sort})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order
    `
  }

  const products = [
    ["b1000000-0000-4000-8000-000000000001", "a1000000-0000-4000-8000-000000000001", "Hamburguesa Clásica", "Pan, carne, lechuga y tomate", 4500, 0],
    ["b1000000-0000-4000-8000-000000000002", "a1000000-0000-4000-8000-000000000001", "Hamburguesa Especial", "Doble carne, cheddar y panceta", 5200, 1],
    ["b1000000-0000-4000-8000-000000000003", "a1000000-0000-4000-8000-000000000002", "Lomito Completo", "Lomo, jamón, queso y huevo", 5800, 0],
    ["b1000000-0000-4000-8000-000000000004", "a1000000-0000-4000-8000-000000000003", "Papas Fritas", "Porción para compartir", 1800, 0],
    ["b1000000-0000-4000-8000-000000000005", "a1000000-0000-4000-8000-000000000003", "Papas con Cheddar", "Con salsa cheddar y panceta", 2200, 1],
    ["b1000000-0000-4000-8000-000000000006", "a1000000-0000-4000-8000-000000000004", "Coca-Cola 500ml", "Botella fría", 1200, 0],
    ["b1000000-0000-4000-8000-000000000007", "a1000000-0000-4000-8000-000000000004", "Agua Mineral", "Sin gas, 500ml", 800, 1],
  ] as const
  for (const [id, catId, name, description, price, sort] of products) {
    await sql`
      INSERT INTO products (id, business_id, category_id, name, description, price_cents, sort_order)
      VALUES (${id}, ${business.id}, ${catId}, ${name}, ${description}, ${price}, ${sort})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description,
        price_cents = EXCLUDED.price_cents, sort_order = EXCLUDED.sort_order
    `
  }

  const groups = [
    ["c1000000-0000-4000-8000-000000000001", "b1000000-0000-4000-8000-000000000001", "Tamaño", "single", true, 0],
    ["c1000000-0000-4000-8000-000000000002", "b1000000-0000-4000-8000-000000000002", "Tamaño", "single", true, 0],
    ["c1000000-0000-4000-8000-000000000003", "b1000000-0000-4000-8000-000000000002", "Extras", "multiple", false, 1],
    ["c1000000-0000-4000-8000-000000000004", "b1000000-0000-4000-8000-000000000003", "Tamaño", "single", true, 0],
  ] as const
  for (const [id, productId, name, selection, required, sort] of groups) {
    await sql`
      INSERT INTO product_variant_groups (id, product_id, name, selection_type, is_required, sort_order)
      VALUES (${id}, ${productId}, ${name}, ${selection}, ${required}, ${sort})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, selection_type = EXCLUDED.selection_type,
        is_required = EXCLUDED.is_required, sort_order = EXCLUDED.sort_order
    `
  }

  const options = [
    ["d1000000-0000-4000-8000-000000000001", "c1000000-0000-4000-8000-000000000001", "Chico", 0, 0],
    ["d1000000-0000-4000-8000-000000000002", "c1000000-0000-4000-8000-000000000001", "Grande", 800, 1],
    ["d1000000-0000-4000-8000-000000000003", "c1000000-0000-4000-8000-000000000002", "Chico", 0, 0],
    ["d1000000-0000-4000-8000-000000000004", "c1000000-0000-4000-8000-000000000002", "Grande", 800, 1],
    ["d1000000-0000-4000-8000-000000000005", "c1000000-0000-4000-8000-000000000003", "Extra queso", 400, 0],
    ["d1000000-0000-4000-8000-000000000006", "c1000000-0000-4000-8000-000000000003", "Huevo", 300, 1],
    ["d1000000-0000-4000-8000-000000000007", "c1000000-0000-4000-8000-000000000004", "Chico", 0, 0],
    ["d1000000-0000-4000-8000-000000000008", "c1000000-0000-4000-8000-000000000004", "Grande", 800, 1],
  ] as const
  for (const [id, groupId, name, delta, sort] of options) {
    await sql`
      INSERT INTO product_variant_options (id, group_id, name, price_delta_cents, sort_order)
      VALUES (${id}, ${groupId}, ${name}, ${delta}, ${sort})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, price_delta_cents = EXCLUDED.price_delta_cents, sort_order = EXCLUDED.sort_order
    `
  }

  const hours = {
    "0": { closed: true },
    "1": { open: "19:00", close: "01:00", closed: false },
    "2": { open: "19:00", close: "01:00", closed: false },
    "3": { open: "19:00", close: "01:00", closed: false },
    "4": { open: "19:00", close: "01:00", closed: false },
    "5": { open: "19:00", close: "01:00", closed: false },
    "6": { open: "19:00", close: "01:00", closed: false },
  }

  await sql`
    INSERT INTO orders_settings (
      business_id, delivery_fee_cents, transfer_alias, transfer_cbu,
      transfer_holder, mp_enabled, is_paused, hours
    )
    VALUES (
      ${business.id}, 500, ${"carri.mp"}, ${"0000003100000000000000"},
      ${"Juan Pérez"}, false, false, ${sql.json(hours as never)}
    )
    ON CONFLICT (business_id) DO UPDATE SET
      delivery_fee_cents = EXCLUDED.delivery_fee_cents,
      transfer_alias = EXCLUDED.transfer_alias,
      transfer_cbu = EXCLUDED.transfer_cbu,
      transfer_holder = EXCLUDED.transfer_holder,
      hours = EXCLUDED.hours
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
