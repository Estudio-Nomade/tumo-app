-- Turnos module: services + settings + bookings + payment attempts
-- Money: INT cents. Duration: INT minutes. Single global calendar v1.

CREATE TABLE IF NOT EXISTS turnos_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  price_cents INT NOT NULL,
  duration_minutes INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT turnos_services_price_check CHECK (price_cents >= 0),
  CONSTRAINT turnos_services_duration_check CHECK (duration_minutes > 0)
);

CREATE INDEX IF NOT EXISTS turnos_services_business_idx
  ON turnos_services (business_id, sort_order);

CREATE TABLE IF NOT EXISTS turnos_settings (
  business_id UUID PRIMARY KEY REFERENCES businesses(id),
  transfer_alias TEXT,
  transfer_cbu TEXT,
  transfer_holder TEXT,
  is_paused BOOLEAN DEFAULT false,
  hours JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS turnos_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  service_id UUID REFERENCES turnos_services(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  service_name TEXT NOT NULL,
  price_cents INT NOT NULL,
  duration_minutes INT NOT NULL,
  notes TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT turnos_bookings_status_check
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  CONSTRAINT turnos_bookings_payment_method_check
    CHECK (payment_method IN ('transfer', 'at_location')),
  CONSTRAINT turnos_bookings_payment_status_check
    CHECK (payment_status IN (
      'unpaid',
      'pending_receipt',
      'pending_verification',
      'paid',
      'rejected'
    )),
  CONSTRAINT turnos_bookings_range_check CHECK (ends_at > starts_at),
  CONSTRAINT turnos_bookings_price_check CHECK (price_cents >= 0)
);

CREATE INDEX IF NOT EXISTS turnos_bookings_business_starts_idx
  ON turnos_bookings (business_id, starts_at);
CREATE INDEX IF NOT EXISTS turnos_bookings_business_status_idx
  ON turnos_bookings (business_id, status, starts_at);
CREATE INDEX IF NOT EXISTS turnos_bookings_business_payment_idx
  ON turnos_bookings (business_id, payment_status);
CREATE INDEX IF NOT EXISTS turnos_bookings_customer_idx
  ON turnos_bookings (customer_id);

CREATE TABLE IF NOT EXISTS turnos_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES turnos_bookings(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_cents INT NOT NULL,
  receipt_bytes BYTEA,
  receipt_mime TEXT,
  receipt_filename TEXT,
  verified_by UUID REFERENCES employees(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT turnos_payments_method_check
    CHECK (method IN ('transfer', 'at_location')),
  CONSTRAINT turnos_payments_status_check
    CHECK (status IN (
      'unpaid',
      'pending_receipt',
      'pending_verification',
      'paid',
      'rejected'
    )),
  CONSTRAINT turnos_payments_amount_check CHECK (amount_cents >= 0)
);

CREATE INDEX IF NOT EXISTS turnos_payments_booking_idx
  ON turnos_payments (booking_id, created_at DESC);
