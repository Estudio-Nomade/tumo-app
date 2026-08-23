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
