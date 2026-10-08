-- Mirror of shell/db/migrations/017_saas_tenant_subscriptions.sql

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  checkout_session_id UUID,
  plan_id TEXT NOT NULL
    CHECK (plan_id IN ('basico', 'pro', 'full')),
  billing_interval TEXT NOT NULL DEFAULT 'month'
    CHECK (billing_interval IN ('month', 'week')),
  module_ids TEXT[] NOT NULL DEFAULT '{}',
  amount_cents INT NOT NULL
    CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'ARS',
  price_version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'paused', 'cancelled')),
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  provider_subscription_id TEXT,
  provider_customer_id TEXT,
  grace_deadline_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_subscriptions_one_open_per_business
  ON tenant_subscriptions (business_id)
  WHERE status IN ('active', 'past_due', 'paused');

CREATE INDEX IF NOT EXISTS tenant_subscriptions_business_idx
  ON tenant_subscriptions (business_id);

CREATE INDEX IF NOT EXISTS tenant_subscriptions_status_idx
  ON tenant_subscriptions (status);
