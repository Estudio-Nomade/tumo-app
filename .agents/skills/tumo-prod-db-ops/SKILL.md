---
name: tumo-prod-db-ops
description: Use when inspecting or mutating Tumo production/staging Postgres data for tenants (businesses, modules, orders catalog, payments, delivery fee, photos) via ad-hoc SQL — not for app code changes, migrations, or schema design.
---

# Tumo prod DB ops

Ad-hoc Postgres ops against the live DB the app already uses. **Never print, log, or commit connection strings or other secrets.**

## Connection (no secrets in chat)

1. Load env from the project root (file already gitignored). Do **not** `cat`/echo the URL.
2. Use the `postgres` package (already a dependency). Prefer a one-shot Node script with `max: 1` and always `sql.end({ timeout: 5 })`.
3. SSL: if the host looks like a Supabase pooler, pass `ssl: "require"` (same idea as `shell/db/pool.ts`).
4. Prefer a heredoc (`node --input-type=module <<'EOF' ... EOF`) so nested quotes in SQL do not break.

```js
// Pattern only — never hardcode or print DATABASE_URL
import postgres from "postgres"
// after sourcing env in the shell that launches node:
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" })
try {
  /* queries */
} finally {
  await sql.end({ timeout: 5 })
}
```

Shell wrapper (from repo root):

```bash
set -a && source .env.local && set +a && node --input-type=module <<'EOF'
# script
EOF
```

**Never:** paste `.env*`, dump `process.env`, commit credentials, or put secrets in the skill/chat.

## Safety

- **Prod = real customers.** Prefer SELECT first; summarize counts/rows before UPDATE/INSERT/DELETE.
- Destructive or bulk writes: confirm with the human unless they already gave an explicit order ("habilitalo", "ponele alias X").
- Scope by `business_id` / `slug`. Never `UPDATE`/`DELETE` without `WHERE`.
- Do not run `seed.ts` / migrate against prod unless explicitly asked.
- Table name is **`businesses`** (plural), not `business`.

## Core entities

| Concept | Table / field |
|--------|----------------|
| Tenant | `businesses` (`id` uuid, `slug`, `name`, `active_modules` text[]) |
| Module gate | `businesses.active_modules` — ids: `loyalty`, `orders`, `turnos` |
| Orders config | `orders_settings` (PK `business_id`) |
| Catalog | `product_categories`, `products`, `product_photos`, variant tables |
| Orders runtime | `orders`, `order_items`, `order_payments` |

Resolve tenant:

```sql
SELECT id, slug, name, active_modules FROM businesses WHERE slug = $slug;
```

Known prod slugs (may grow): `carri`, `defe`.

## Enable module (e.g. orders)

1. Append id to `active_modules` (dedupe + sort).
2. For `orders`, ensure a row in `orders_settings` (create if missing).

```js
const mods = [...new Set([...(current.active_modules ?? []), "orders"])].sort()
await sql`UPDATE businesses SET active_modules = ${mods} WHERE id = ${id}`
await sql`
  INSERT INTO orders_settings (business_id, delivery_fee_cents, is_paused, hours)
  VALUES (${id}, 0, false, ${sql.json(defaultHours)})
  ON CONFLICT (business_id) DO NOTHING
`
```

Default hours shape (day keys `"0"`..`"6"`): `{ open, close, closed }` or `{ closed: true }`.

App also has admin APIs that sync billing/subscriptions tables; those tables may be absent on older prod DBs. For a quick enable, `active_modules` + `orders_settings` is enough for the public/dashboard module gate.

## Orders settings (payments / delivery)

Columns that matter:

| Column | Meaning |
|--------|---------|
| `delivery_fee_cents` | Delivery fee (see money unit below) |
| `transfer_alias` / `transfer_cbu` / `transfer_holder` | Bank transfer data shown to customer |
| `mp_enabled` / `mp_*` | Mercado Pago (often off / unused) |
| `is_paused` | Pause taking orders |
| `hours` | jsonb open hours |

Checkout methods in app code: `at_pickup` (efectivo, always) and `transfer` (needs alias/CBU data to be useful).

## Money unit (critical)

In orders/products UI, **`price_cents` and `delivery_fee_cents` store whole pesos as integers**, not ARS centavos.

- Human "$10.000" → store `10000`
- `formatCents(10000)` → `"10.000"`

Parse human ARS like `"10.000,00 ARS"` → strip to integer pesos `10000`. Do **not** multiply by 100.

## Catalog without photos

`products.photo` is nullable. Cover can also live in `product_photos` (`product_id`, `url`, `sort_order`).

"Has photo" check:

```sql
SELECT p.name
FROM products p
WHERE p.business_id = $id
  AND p.photo IS NULL
  AND NOT EXISTS (SELECT 1 FROM product_photos ph WHERE ph.product_id = p.id)
```

Insert product:

```sql
INSERT INTO products (
  business_id, category_id, name, description, price_cents, photo, is_available, sort_order
) VALUES ($biz, $cat, $name, $desc, $pesos, NULL, true, $sort)
```

Create categories first (`product_categories.business_id`, `name`, `sort_order`).

## Public URLs

Base: production host the human gives (e.g. `https://tumo.com.ar`).

- Catalog: `/{slug}/orders`
- Cart: `/{slug}/orders/cart`
- Product: `/{slug}/orders/producto/{id}`
- Dashboard products: `/{slug}/dashboard/orders/productos`

## Common ops cheat sheet

| Ask | Action |
|-----|--------|
| Qué hay en businesses | `SELECT` all tenants, summarize modules |
| ¿Tiene orders? | `active_modules` includes `orders` + `orders_settings` row |
| Habilitar orders | Update modules + insert settings |
| Cargar productos | Categories + products; photo null OK |
| Sin foto | List products missing cover (photo + photos) |
| Alias transferencia | `UPDATE orders_settings SET transfer_alias = …` |
| Delivery $N | `delivery_fee_cents = N` (pesos enteros) |
| Medios de pago | Read `orders_settings` transfer + mp fields |

## Code map (read before inventing schema)

- `shell/db/pool.ts` — connection
- `shell/db/business.ts` — business + billing join
- `shell/db/seed.ts` / `seed-data.ts` — catalog shape examples (dev only)
- `modules/orders/api/*` — products, catalog, settings, orders
- `modules/orders/lib/types.ts` — `PaymentMethod`, `formatCents`
- `app/(public)/[slug]/orders/` — public routes

## Anti-patterns

| Mistake | Do instead |
|---------|------------|
| Print `DATABASE_URL` | Source env silently; only show query results |
| Table `business` | Use `businesses` |
| Store $10.000 as `1000000` | Store `10000` |
| Enable orders without settings row | Insert `orders_settings` |
| Run full seed on prod | Targeted INSERT/UPDATE only |
| Leave connection open | Always `sql.end` in `finally` |
| Quote hell in `-e '...'` | Heredoc `<<'EOF'` |
