-- Tumo internal admin: staff auth + business billing (manual, no gateway)
-- Money: INT cents. Admin cookie is separate from tenant session_token.

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_sessions_token_idx ON admin_sessions (token);
CREATE INDEX IF NOT EXISTS admin_sessions_admin_user_idx ON admin_sessions (admin_user_id);

CREATE TABLE IF NOT EXISTS business_billing (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  monthly_amount_cents INT NOT NULL DEFAULT 1990000,
  status TEXT NOT NULL DEFAULT 'pendiente',
  last_payment_at TIMESTAMPTZ,
  next_due_at TIMESTAMPTZ,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT business_billing_amount_check CHECK (monthly_amount_cents >= 0),
  CONSTRAINT business_billing_status_check
    CHECK (status IN ('al_dia', 'pendiente', 'vencido'))
);

CREATE TABLE IF NOT EXISTS business_billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  marked_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT business_billing_payments_amount_check CHECK (amount_cents >= 0)
);

CREATE INDEX IF NOT EXISTS business_billing_payments_business_idx
  ON business_billing_payments (business_id, paid_at DESC);
