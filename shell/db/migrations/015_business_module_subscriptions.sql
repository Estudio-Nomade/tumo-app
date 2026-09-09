CREATE TABLE IF NOT EXISTS business_module_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  activated_at TIMESTAMPTZ NOT NULL,
  deactivated_at TIMESTAMPTZ,
  billing_anchor_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_bms_business_status
  ON business_module_subscriptions (business_id, status);

-- Backfill: one active row per id in businesses.active_modules
INSERT INTO business_module_subscriptions (
  business_id,
  module_id,
  status,
  activated_at,
  billing_anchor_at,
  updated_at
)
SELECT
  b.id,
  m.module_id,
  'active',
  COALESCE(bb.last_payment_at, b.created_at, now()),
  COALESCE(bb.last_payment_at, b.created_at, now()),
  now()
FROM businesses b
LEFT JOIN business_billing bb ON bb.business_id = b.id
CROSS JOIN LATERAL unnest(COALESCE(b.active_modules, '{}'::text[])) AS m(module_id)
ON CONFLICT (business_id, module_id) DO NOTHING;
