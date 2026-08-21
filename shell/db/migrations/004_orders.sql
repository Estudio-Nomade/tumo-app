-- Orders module (food truck): catálogo + pedidos + pagos + settings
-- Precios en centavos INT. Snapshots en todo lo que entra a un pedido.
-- `customers` NO se altera: orders hace upsert por (phone, business_id).

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_categories_business_idx
  ON product_categories (business_id, sort_order);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  category_id UUID REFERENCES product_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price_cents INT NOT NULL,
  photo TEXT,
  is_available BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_business_idx
  ON products (business_id, sort_order);
CREATE INDEX IF NOT EXISTS products_category_idx
  ON products (business_id, category_id);

CREATE TABLE IF NOT EXISTS product_variant_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  selection_type TEXT NOT NULL DEFAULT 'single',
  is_required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  CONSTRAINT product_variant_groups_selection_type_check
    CHECK (selection_type IN ('single', 'multiple'))
);

CREATE INDEX IF NOT EXISTS product_variant_groups_product_idx
  ON product_variant_groups (product_id, sort_order);

CREATE TABLE IF NOT EXISTS product_variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES product_variant_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta_cents INT DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS product_variant_options_group_idx
  ON product_variant_options (group_id, sort_order);

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
  CONSTRAINT orders_status_check
    CHECK (status IN ('pending','confirmed','preparing','ready','completed','cancelled')),
  CONSTRAINT orders_payment_method_check
    CHECK (payment_method IN ('transfer','mercadopago','at_pickup')),
  CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('unpaid','pending','pending_receipt','pending_verification','paid','rejected')),
  CONSTRAINT orders_fulfillment_check
    CHECK (fulfillment IN ('pickup','delivery'))
);

CREATE INDEX IF NOT EXISTS orders_business_status_idx
  ON orders (business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_customer_idx
  ON orders (customer_id);

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

CREATE INDEX IF NOT EXISTS order_items_order_idx
  ON order_items (order_id);

CREATE TABLE IF NOT EXISTS order_item_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  option_name TEXT NOT NULL,
  price_delta_cents INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS order_item_variants_item_idx
  ON order_item_variants (order_item_id);

-- Pagos: una fila por INTENTO. orders.payment_status = estado denormalizado actual.
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

CREATE INDEX IF NOT EXISTS order_payments_order_idx
  ON order_payments (order_id, created_at DESC);

-- Config del módulo por negocio (seed/manual en MVP).
CREATE TABLE IF NOT EXISTS orders_settings (
  business_id UUID PRIMARY KEY REFERENCES businesses(id),
  delivery_fee_cents INT DEFAULT 0,
  transfer_alias TEXT,
  transfer_cbu TEXT,
  transfer_holder TEXT,
  mp_enabled BOOLEAN DEFAULT false,
  is_paused BOOLEAN DEFAULT false,
  hours JSONB NOT NULL DEFAULT '{}'::jsonb
);
