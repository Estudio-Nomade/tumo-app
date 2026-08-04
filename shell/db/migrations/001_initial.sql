DROP TABLE IF EXISTS auth_codes;

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo TEXT,
  primary_color TEXT DEFAULT '#F97316',
  secondary_color TEXT DEFAULT '#FACC15',
  active_modules TEXT[] DEFAULT '{"loyalty"}',
  purchases_needed INT DEFAULT 10,
  reward_name TEXT DEFAULT 'hamburguesa gratis',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT DEFAULT 'employee',  -- 'employee' | 'owner'
  business_id UUID REFERENCES businesses(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  birthday DATE,
  code TEXT UNIQUE NOT NULL,
  purchases INT DEFAULT 0,
  total_purchases INT DEFAULT 0,
  business_id UUID REFERENCES businesses(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(phone, business_id)
);

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  employee_id UUID REFERENCES employees(id),
  business_id UUID REFERENCES businesses(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  employee_id UUID REFERENCES employees(id),
  business_id UUID REFERENCES businesses(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
