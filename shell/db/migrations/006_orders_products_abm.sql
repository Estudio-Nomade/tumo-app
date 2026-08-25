-- ABM de productos: nombre único por negocio, precio ≥ 0,
-- y borrar producto no rompe pedidos (snapshot en order_items).
CREATE UNIQUE INDEX IF NOT EXISTS products_business_name_unique
  ON products (business_id, lower(name));

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_price_cents_check;
ALTER TABLE products
  ADD CONSTRAINT products_price_cents_check CHECK (price_cents >= 0);

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
