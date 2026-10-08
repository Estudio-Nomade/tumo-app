-- Mirror of shell/db/migrations/019_saas_owner_accounts.sql
CREATE TABLE IF NOT EXISTS owner_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT owner_accounts_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS owner_accounts_email_idx ON owner_accounts (email);

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS owner_account_id UUID REFERENCES owner_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS employees_owner_account_idx
  ON employees (owner_account_id)
  WHERE owner_account_id IS NOT NULL;
