-- USD cents per module (app sets real fee = #active_modules × 6999).
-- Do not edit 010_tumo_admin.sql; this replaces the ARS 1990000 default.

ALTER TABLE business_billing
  ALTER COLUMN monthly_amount_cents SET DEFAULT 0;

UPDATE business_billing bb
SET monthly_amount_cents = (
  SELECT COALESCE(cardinality(b.active_modules), 0) * 6999
  FROM businesses b
  WHERE b.id = bb.business_id
),
updated_at = now();
