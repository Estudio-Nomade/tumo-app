#!/usr/bin/env bash
# Local-only: docker compose Postgres on :5432 + full migrate + optional demo SaaS row.
# Does not touch friend's cloud. Does not rewrite .env.local (app may still point at :54322).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.bun/bin:${PATH}"

echo "== docker compose db =="
docker compose up -d db
for i in $(seq 1 20); do
  st=$(docker inspect -f '{{.State.Health.Status}}' tumo-supabase-db 2>/dev/null || echo missing)
  [[ "$st" == "healthy" ]] && break
  sleep 1
done
echo "health: $(docker inspect -f '{{.State.Health.Status}}' tumo-supabase-db)"

export DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable'
echo "== migrate ($DATABASE_URL masked host 5432) =="
bun shell/db/migrate.ts

if [[ "${1:-}" == "--seed-demo-saas" ]]; then
  echo "== seed demo SaaS subscription (local only) =="
  # minimal business + tenant_subscriptions so admin UI has something to show
  docker exec -i tumo-supabase-db psql -U postgres -d postgres <<'SQL'
INSERT INTO businesses (id, name, slug, active_modules, primary_color, secondary_color)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'Demo SaaS Local',
  'demo-saas',
  ARRAY['loyalty','orders']::text[],
  '#7527E3',
  '#5B35C9'
)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      active_modules = EXCLUDED.active_modules;

INSERT INTO business_billing (business_id, monthly_amount_cents, status, last_payment_at, next_due_at, updated_at)
SELECT id, 8999000, 'al_dia', now(), now() + interval '1 month', now()
FROM businesses WHERE slug = 'demo-saas'
ON CONFLICT (business_id) DO UPDATE
  SET monthly_amount_cents = EXCLUDED.monthly_amount_cents,
      status = 'al_dia',
      last_payment_at = EXCLUDED.last_payment_at,
      next_due_at = EXCLUDED.next_due_at,
      updated_at = now();

INSERT INTO tenant_subscriptions (
  business_id, plan_id, billing_interval, module_ids,
  amount_cents, currency, price_version, status, provider,
  provider_subscription_id, subscribed_at, current_period_end
)
SELECT
  b.id, 'pro', 'month', ARRAY['loyalty','orders']::text[],
  8999000, 'ARS', 1, 'active', 'mercadopago',
  'local-demo-preapproval', now(), now() + interval '1 month'
FROM businesses b WHERE b.slug = 'demo-saas'
ON CONFLICT DO NOTHING;

-- If unique partial index blocks second insert, update existing open row:
UPDATE tenant_subscriptions ts
SET plan_id = 'pro',
    module_ids = ARRAY['loyalty','orders']::text[],
    amount_cents = 8999000,
    status = 'active',
    provider_subscription_id = 'local-demo-preapproval',
    updated_at = now()
FROM businesses b
WHERE b.slug = 'demo-saas' AND ts.business_id = b.id
  AND ts.status IN ('active','past_due','paused');

SELECT b.slug, ts.plan_id, ts.status, ts.subscribed_at
FROM tenant_subscriptions ts
JOIN businesses b ON b.id = ts.business_id
WHERE b.slug = 'demo-saas';
SQL
fi

echo
echo "Local DB ready on :5432."
echo "Point the app at it for this session:"
echo "  export DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable'"
echo "  bun run dev"
echo
echo "Friend's real DB checklist:"
echo "  bash scripts/saas-mp-db-migrate-checklist.sh"
echo "  # then with HIS URL:  ... --apply"
