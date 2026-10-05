-- SaaS checkout sessions + provider webhook event log (local-first; friend's DB later).

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'started'
    CHECK (status IN (
      'started', 'awaiting_payment', 'paid', 'provisioned',
      'failed', 'expired', 'cancelled'
    )),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  business_name TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  payer_document TEXT,
  plan_id TEXT NOT NULL
    CHECK (plan_id IN ('basico', 'pro', 'full')),
  billing_interval TEXT NOT NULL DEFAULT 'month'
    CHECK (billing_interval IN ('month', 'week')),
  module_ids TEXT[] NOT NULL DEFAULT '{}',
  price_version INT NOT NULL DEFAULT 1,
  amount_cents INT NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'ARS',
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  provider_checkout_id TEXT,
  provider_payment_id TEXT,
  provider_subscription_id TEXT,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  provision_error TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkout_sessions_email_status_idx
  ON checkout_sessions (email, status);

CREATE INDEX IF NOT EXISTS checkout_sessions_status_idx
  ON checkout_sessions (status);

CREATE TABLE IF NOT EXISTS provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  provider_event_id TEXT NOT NULL,
  type TEXT NOT NULL,
  external_reference TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS provider_events_external_ref_idx
  ON provider_events (external_reference);
