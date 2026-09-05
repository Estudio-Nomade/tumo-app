-- Multi-foto por producto: filas ordenables + backfill desde products.photo (cover denormalizado)

CREATE TABLE IF NOT EXISTS product_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_photos_product_sort_idx
  ON product_photos (product_id, sort_order);

INSERT INTO product_photos (product_id, url, sort_order)
SELECT p.id, p.photo, 0
FROM products p
WHERE p.photo IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM product_photos pp WHERE pp.product_id = p.id
  );
