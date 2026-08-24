-- Realtime para pedidos (confirmación del cliente + panel del empleado)
-- MVP single-business: la lectura anon se habilita porque el acceso a un pedido
-- puntual ya está mediado por UUID opaco en la API (GET /api/orders/[id]).

ALTER PUBLICATION supabase_realtime ADD TABLE orders;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON orders TO anon;

CREATE POLICY orders_realtime_read
  ON orders FOR SELECT TO anon
  USING (true);
