import { sql } from "./pool"
import {
  categories,
  demoCustomers,
  demoOrders,
  products,
  variantGroups,
  variantOptions,
} from "./seed-data"

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
      ${"{loyalty,orders,turnos}"},
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

  for (const c of categories) {
    await sql`
      INSERT INTO product_categories (id, business_id, name, sort_order)
      VALUES (${c.id}, ${business.id}, ${c.name}, ${c.sortOrder})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order
    `
  }

  for (const p of products) {
    await sql`
      INSERT INTO products (id, business_id, category_id, name, description, price_cents, sort_order)
      VALUES (${p.id}, ${business.id}, ${p.categoryId}, ${p.name}, ${p.description}, ${p.priceCents}, ${p.sortOrder})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description,
        price_cents = EXCLUDED.price_cents, sort_order = EXCLUDED.sort_order
    `
  }

  for (const g of variantGroups) {
    await sql`
      INSERT INTO product_variant_groups (id, product_id, name, selection_type, is_required, sort_order)
      VALUES (${g.id}, ${g.productId}, ${g.name}, ${g.selectionType}, ${g.isRequired}, ${g.sortOrder})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, selection_type = EXCLUDED.selection_type,
        is_required = EXCLUDED.is_required, sort_order = EXCLUDED.sort_order
    `
  }

  for (const o of variantOptions) {
    await sql`
      INSERT INTO product_variant_options (id, group_id, name, price_delta_cents, sort_order)
      VALUES (${o.id}, ${o.groupId}, ${o.name}, ${o.priceDeltaCents}, ${o.sortOrder})
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
      ${"Juan Pérez"}, true, false, ${sql.json(hours as never)}
    )
    ON CONFLICT (business_id) DO UPDATE SET
      delivery_fee_cents = EXCLUDED.delivery_fee_cents,
      transfer_alias = EXCLUDED.transfer_alias,
      transfer_cbu = EXCLUDED.transfer_cbu,
      transfer_holder = EXCLUDED.transfer_holder,
      mp_enabled = EXCLUDED.mp_enabled,
      hours = EXCLUDED.hours
  `

  const turnosHours = {
    mon: [["09:00", "18:00"]],
    tue: [["09:00", "18:00"]],
    wed: [["09:00", "18:00"]],
    thu: [["09:00", "18:00"]],
    fri: [["09:00", "18:00"]],
    sat: [["09:00", "13:00"]],
  }

  await sql`
    INSERT INTO turnos_settings (
      business_id, transfer_alias, transfer_cbu, transfer_holder, is_paused, hours
    )
    VALUES (
      ${business.id},
      ${"carri.turnos"},
      ${"0000003100000000000001"},
      ${"El Auténtico Carri"},
      false,
      ${sql.json(turnosHours as never)}
    )
    ON CONFLICT (business_id) DO UPDATE SET
      transfer_alias = EXCLUDED.transfer_alias,
      transfer_cbu = EXCLUDED.transfer_cbu,
      transfer_holder = EXCLUDED.transfer_holder,
      hours = EXCLUDED.hours
  `

  const turnosServices = [
    { name: "Corte clásico", priceCents: 8000, durationMinutes: 30, sortOrder: 0 },
    { name: "Corte + barba", priceCents: 12000, durationMinutes: 45, sortOrder: 1 },
  ]
  for (const s of turnosServices) {
    await sql`
      INSERT INTO turnos_services (
        business_id, name, price_cents, duration_minutes, is_active, sort_order
      )
      SELECT
        ${business.id}, ${s.name}, ${s.priceCents}, ${s.durationMinutes}, true, ${s.sortOrder}
      WHERE NOT EXISTS (
        SELECT 1 FROM turnos_services
        WHERE business_id = ${business.id} AND name = ${s.name}
      )
    `
  }

  for (const c of demoCustomers) {
    await sql`
      INSERT INTO customers (id, name, phone, code, business_id)
      VALUES (${c.id}, ${c.name}, ${c.phone}, ${c.code}, ${business.id})
      ON CONFLICT (id) DO NOTHING
    `
  }

  for (const order of demoOrders) {
    const inserted = await sql`
      INSERT INTO orders (
        id, business_id, customer_id, order_number, status, payment_method,
        payment_status, fulfillment, delivery_address, delivery_fee_cents,
        subtotal_cents, total_cents, notes
      )
      VALUES (
        ${order.id}, ${business.id}, ${order.customerId}, ${order.orderNumber}, ${order.status},
        ${order.paymentMethod}, ${order.paymentStatus}, ${order.fulfillment},
        ${order.deliveryAddress}, ${order.deliveryFeeCents}, ${order.subtotalCents},
        ${order.totalCents}, ${order.notes}
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `
    if (inserted.length === 0) continue

    for (const item of order.items) {
      const [itemRow] = await sql`
        INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price_cents, notes)
        VALUES (${item.id}, ${order.id}, ${item.productId}, ${item.productName}, ${item.quantity}, ${item.unitPriceCents}, ${item.notes})
        RETURNING id
      `
      for (const v of item.variants) {
        await sql`
          INSERT INTO order_item_variants (order_item_id, group_name, option_name, price_delta_cents)
          VALUES (${itemRow.id}, ${v.groupName}, ${v.optionName}, ${v.priceDeltaCents})
        `
      }
    }

    for (const pay of order.payments) {
      await sql`
        INSERT INTO order_payments (id, order_id, method, status, mp_status)
        VALUES (${pay.id}, ${order.id}, ${pay.method}, ${pay.status}, ${pay.mpStatus ?? null})
      `
    }
  }

  await sql`
    INSERT INTO business_billing (
      business_id,
      monthly_amount_cents,
      status,
      last_payment_at,
      next_due_at,
      updated_at
    )
    VALUES (
      ${business.id},
      ${1_990_000},
      ${"al_dia"},
      ${new Date()},
      ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)},
      ${new Date()}
    )
    ON CONFLICT (business_id) DO UPDATE SET
      status = EXCLUDED.status,
      monthly_amount_cents = EXCLUDED.monthly_amount_cents,
      updated_at = EXCLUDED.updated_at
  `

  const [defe] = await sql`
    SELECT id FROM businesses WHERE slug = ${"defe"} LIMIT 1
  `
  if (defe) {
    await sql`
      INSERT INTO business_billing (
        business_id,
        monthly_amount_cents,
        status,
        updated_at
      )
      VALUES (
        ${defe.id},
        ${1_990_000},
        ${"vencido"},
        ${new Date()}
      )
      ON CONFLICT (business_id) DO UPDATE SET
        status = ${"vencido"},
        updated_at = ${new Date()}
    `
  }

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
