-- Complete the orders + loyalty schema (tables/columns missing from the initial Hermes migration)

-- Fix divergent columns on existing tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo TEXT;
ALTER TABLE product_variant_options ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Customers (shared by loyalty + orders)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  birthday DATE,
  code TEXT UNIQUE NOT NULL,
  points INT DEFAULT 0,
  total_points INT DEFAULT 0,
  business_id UUID REFERENCES businesses(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(phone, business_id)
);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);

-- Sessions (employee auth)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- Point movements (loyalty ledger)
CREATE TABLE IF NOT EXISTS point_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  employee_id UUID REFERENCES employees(id),
  business_id UUID REFERENCES businesses(id),
  points INT NOT NULL DEFAULT 1,
  amount_cents INT NULL,
  range_label TEXT NULL,
  kind TEXT NOT NULL DEFAULT 'earn',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT point_movements_kind_check CHECK (kind IN ('earn', 'redeem'))
);
CREATE INDEX IF NOT EXISTS idx_point_movements_customer ON point_movements(customer_id);
CREATE INDEX IF NOT EXISTS idx_point_movements_business ON point_movements(business_id);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_number INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  fulfillment TEXT NOT NULL,
  delivery_address TEXT,
  delivery_fee_cents INT DEFAULT 0,
  subtotal_cents INT NOT NULL,
  total_cents INT NOT NULL,
  notes TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (business_id, order_number),
  CONSTRAINT orders_status_check CHECK (status IN ('pending','confirmed','preparing','ready','completed','cancelled')),
  CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('transfer','mercadopago','at_pickup')),
  CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('unpaid','pending','pending_receipt','pending_verification','paid','rejected')),
  CONSTRAINT orders_fulfillment_check CHECK (fulfillment IN ('pickup','delivery'))
);
CREATE INDEX IF NOT EXISTS idx_orders_business_status ON orders (business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INT NOT NULL,
  unit_price_cents INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT order_items_quantity_check CHECK (quantity BETWEEN 1 AND 20)
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

-- Order item variants
CREATE TABLE IF NOT EXISTS order_item_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  option_name TEXT NOT NULL,
  price_delta_cents INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_item_variants_item ON order_item_variants (order_item_id);

-- Order payments (one row per attempt)
CREATE TABLE IF NOT EXISTS order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  receipt_image BYTEA,
  receipt_mime TEXT,
  mp_preference_id TEXT,
  mp_payment_id TEXT UNIQUE,
  mp_status TEXT,
  verified_by UUID REFERENCES employees(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_payments_order ON order_payments (order_id, created_at DESC);
