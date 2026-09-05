-- Mirror shell/db/migrations/011_orders_drop_mercadopago.sql
UPDATE orders
SET
  payment_method = 'transfer',
  payment_status = CASE
    WHEN payment_status = 'pending' THEN 'pending_receipt'
    ELSE payment_status
  END
WHERE payment_method = 'mercadopago';

UPDATE order_payments
SET method = 'transfer'
WHERE method = 'mercadopago';

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('transfer', 'at_pickup'));
