-- Points-native loyalty cutover (clean slate)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'purchases_needed'
  ) THEN
    ALTER TABLE businesses RENAME COLUMN purchases_needed TO points_needed;
  END IF;
END $$;

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS point_ranges JSONB NOT NULL DEFAULT '[{"min_cents":0,"max_cents":null,"points":1}]'::jsonb;

UPDATE businesses
SET point_ranges = '[{"min_cents":0,"max_cents":null,"points":1}]'::jsonb
WHERE point_ranges IS NULL OR point_ranges = '[]'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'purchases'
  ) THEN
    ALTER TABLE customers RENAME COLUMN purchases TO points;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'total_purchases'
  ) THEN
    ALTER TABLE customers RENAME COLUMN total_purchases TO total_points;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'purchases'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'point_movements'
  ) THEN
    ALTER TABLE purchases RENAME TO point_movements;
  END IF;
END $$;

ALTER TABLE point_movements
  ADD COLUMN IF NOT EXISTS points INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS amount_cents INT NULL,
  ADD COLUMN IF NOT EXISTS range_label TEXT NULL,
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'earn';

ALTER TABLE point_movements
  DROP CONSTRAINT IF EXISTS point_movements_kind_check;

ALTER TABLE point_movements
  ADD CONSTRAINT point_movements_kind_check
  CHECK (kind IN ('earn', 'redeem'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'redemptions'
  ) THEN
    INSERT INTO point_movements (customer_id, employee_id, business_id, points, kind, created_at)
    SELECT customer_id, employee_id, business_id, 0, 'redeem', created_at
    FROM redemptions;
    DROP TABLE redemptions;
  END IF;
END $$;
