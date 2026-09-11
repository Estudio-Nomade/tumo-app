-- 016 schema normalization expand (dev-first)
-- Crea cajones nuevos + backfill. NO dropea columnas legacy (contract = fase posterior).

-- A) Persona global por teléfono (autocomplete nombre/cumple entre comercios)
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT,
  birthday DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS people_phone_idx ON people (phone);

-- Backfill people desde customers (queda el name/birthday más recientes no nulos por phone)
INSERT INTO people (phone, name, birthday)
SELECT DISTINCT ON (c.phone)
  c.phone,
  NULLIF(BTRIM(c.name), ''),
  c.birthday
FROM customers c
WHERE c.phone IS NOT NULL AND BTRIM(c.phone) <> ''
ORDER BY c.phone, c.created_at DESC NULLS LAST
ON CONFLICT (phone) DO NOTHING;

-- Enriquecer name/birthday si people ya existía vacío
UPDATE people p
SET
  name = COALESCE(p.name, x.name),
  birthday = COALESCE(p.birthday, x.birthday),
  updated_at = now()
FROM (
  SELECT DISTINCT ON (c.phone)
    c.phone,
    NULLIF(BTRIM(c.name), '') AS name,
    c.birthday
  FROM customers c
  ORDER BY c.phone, c.created_at DESC NULLS LAST
) x
WHERE p.phone = x.phone
  AND (p.name IS NULL OR p.birthday IS NULL);

-- E) Ficha cliente-en-comercio: link a persona + contador de premios (estrellita)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES people(id),
  ADD COLUMN IF NOT EXISTS rewards_redeemed_count INT NOT NULL DEFAULT 0;

UPDATE customers c
SET person_id = p.id
FROM people p
WHERE c.phone = p.phone
  AND c.person_id IS NULL;

-- Contador de canjes desde ledger (si existe point_movements)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'point_movements'
  ) THEN
    UPDATE customers c
    SET rewards_redeemed_count = sub.cnt
    FROM (
      SELECT customer_id, COUNT(*)::int AS cnt
      FROM point_movements
      WHERE kind = 'redeem'
      GROUP BY customer_id
    ) sub
    WHERE c.id = sub.customer_id
      AND c.rewards_redeemed_count = 0
      AND sub.cnt > 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS customers_person_id_idx ON customers (person_id);

-- C) Programa de puntos 1:1 por comercio
CREATE TABLE IF NOT EXISTS loyalty_settings (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  points_needed INT NOT NULL DEFAULT 10
    CHECK (points_needed >= 1 AND points_needed <= 1000000),
  reward_name TEXT NOT NULL DEFAULT 'recompensa',
  max_points_per_purchase INT NULL
    CHECK (max_points_per_purchase IS NULL OR max_points_per_purchase > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO loyalty_settings (business_id, points_needed, reward_name, max_points_per_purchase)
SELECT
  b.id,
  COALESCE(b.points_needed, 10),
  COALESCE(NULLIF(BTRIM(b.reward_name), ''), 'recompensa'),
  NULL
FROM businesses b
ON CONFLICT (business_id) DO NOTHING;

-- Franjas tabulares (fuente normalizada; businesses.point_ranges sigue vivo en 016)
CREATE TABLE IF NOT EXISTS loyalty_point_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  min_cents INT NOT NULL CHECK (min_cents >= 0),
  max_cents INT NULL,
  points INT NOT NULL CHECK (points >= 0 AND points <= 1000000),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_point_ranges_max_gt_min
    CHECK (max_cents IS NULL OR max_cents > min_cents)
);

CREATE INDEX IF NOT EXISTS loyalty_point_ranges_business_sort_idx
  ON loyalty_point_ranges (business_id, sort_order, min_cents);

-- Backfill ranges desde JSONB businesses.point_ranges
INSERT INTO loyalty_point_ranges (business_id, min_cents, max_cents, points, sort_order)
SELECT
  b.id,
  COALESCE((elem->>'min_cents')::int, 0),
  CASE
    WHEN elem->>'max_cents' IS NULL OR elem->>'max_cents' = 'null' THEN NULL
    ELSE (elem->>'max_cents')::int
  END,
  COALESCE((elem->>'points')::int, 0),
  (ord - 1)
FROM businesses b
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(b.point_ranges, '[]'::jsonb))
  WITH ORDINALITY AS t(elem, ord)
WHERE jsonb_typeof(COALESCE(b.point_ranges, '[]'::jsonb)) = 'array'
  AND NOT EXISTS (
    SELECT 1 FROM loyalty_point_ranges r WHERE r.business_id = b.id
  );

-- Si un business no tenía ranges, un tramo abierto default 1 pt
INSERT INTO loyalty_point_ranges (business_id, min_cents, max_cents, points, sort_order)
SELECT b.id, 0, NULL, 1, 0
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM loyalty_point_ranges r WHERE r.business_id = b.id
);

-- I) Alias base del comercio
CREATE TABLE IF NOT EXISTS business_payment_profiles (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  transfer_alias TEXT,
  transfer_cbu TEXT,
  transfer_holder TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO business_payment_profiles (business_id, transfer_alias, transfer_cbu, transfer_holder)
SELECT
  b.id,
  COALESCE(os.transfer_alias, ts.transfer_alias),
  COALESCE(os.transfer_cbu, ts.transfer_cbu),
  COALESCE(os.transfer_holder, ts.transfer_holder)
FROM businesses b
LEFT JOIN orders_settings os ON os.business_id = b.id
LEFT JOIN turnos_settings ts ON ts.business_id = b.id
ON CONFLICT (business_id) DO NOTHING;

-- Si el perfil quedó vacío pero algún módulo tiene datos, rellenar
UPDATE business_payment_profiles p
SET
  transfer_alias = COALESCE(p.transfer_alias, os.transfer_alias, ts.transfer_alias),
  transfer_cbu = COALESCE(p.transfer_cbu, os.transfer_cbu, ts.transfer_cbu),
  transfer_holder = COALESCE(p.transfer_holder, os.transfer_holder, ts.transfer_holder),
  updated_at = now()
FROM businesses b
LEFT JOIN orders_settings os ON os.business_id = b.id
LEFT JOIN turnos_settings ts ON ts.business_id = b.id
WHERE p.business_id = b.id;

-- Propagar alias del perfil a settings de módulos que estén vacíos
-- (al cargar se ven en todos los módulos activos)
UPDATE orders_settings os
SET
  transfer_alias = COALESCE(os.transfer_alias, p.transfer_alias),
  transfer_cbu = COALESCE(os.transfer_cbu, p.transfer_cbu),
  transfer_holder = COALESCE(os.transfer_holder, p.transfer_holder)
FROM business_payment_profiles p
WHERE os.business_id = p.business_id;

UPDATE turnos_settings ts
SET
  transfer_alias = COALESCE(ts.transfer_alias, p.transfer_alias),
  transfer_cbu = COALESCE(ts.transfer_cbu, p.transfer_cbu),
  transfer_holder = COALESCE(ts.transfer_holder, p.transfer_holder)
FROM business_payment_profiles p
WHERE ts.business_id = p.business_id;

-- S) Horarios por módulo con tramos partidos
-- weekday: 0=domingo … 6=sábado (JS getDay); start/end en minutos desde 00:00
CREATE TABLE IF NOT EXISTS module_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL
    CHECK (module_id IN ('orders', 'turnos', 'loyalty')),
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_minute INT NOT NULL CHECK (start_minute >= 0 AND start_minute < 1440),
  end_minute INT NOT NULL CHECK (end_minute > start_minute AND end_minute <= 1440),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS module_hours_business_module_day_idx
  ON module_hours (business_id, module_id, weekday, sort_order);

-- Helper: parsea hours JSONB común.
-- Soporta shapes:
--   {"0":[{"open":"09:00","close":"13:00"},{"open":"17:00","close":"21:00"}], ...}
--   {"mon":[{"start":"09:00","end":"13:00"}], ...}
--   {"0":{"open":"09:00","close":"18:00"}}
CREATE OR REPLACE FUNCTION tumo_parse_hhmm_to_minute(t TEXT)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts TEXT[];
  h INT;
  m INT;
BEGIN
  IF t IS NULL OR BTRIM(t) = '' THEN
    RETURN NULL;
  END IF;
  parts := regexp_split_to_array(BTRIM(t), '[:hH]');
  IF array_length(parts, 1) < 2 THEN
    RETURN NULL;
  END IF;
  h := parts[1]::int;
  m := parts[2]::int;
  IF h < 0 OR h > 24 OR m < 0 OR m > 59 THEN
    RETURN NULL;
  END IF;
  IF h = 24 AND m = 0 THEN
    RETURN 1440;
  END IF;
  RETURN h * 60 + m;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION tumo_weekday_from_key(k TEXT)
RETURNS SMALLINT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF k ~ '^[0-6]$' THEN
    RETURN k::smallint;
  END IF;
  CASE lower(k)
    WHEN 'sun', 'dom', 'domingo', 'sunday' THEN RETURN 0;
    WHEN 'mon', 'lun', 'lunes', 'monday' THEN RETURN 1;
    WHEN 'tue', 'mar', 'martes', 'tuesday' THEN RETURN 2;
    WHEN 'wed', 'mie', 'mié', 'miercoles', 'miércoles', 'wednesday' THEN RETURN 3;
    WHEN 'thu', 'jue', 'jueves', 'thursday' THEN RETURN 4;
    WHEN 'fri', 'vie', 'viernes', 'friday' THEN RETURN 5;
    WHEN 'sat', 'sab', 'sáb', 'sabado', 'sábado', 'saturday' THEN RETURN 6;
    ELSE RETURN NULL;
  END CASE;
END;
$$;

-- Backfill module_hours desde orders_settings.hours y turnos_settings.hours
DO $$
DECLARE
  r RECORD;
  day_key TEXT;
  day_val JSONB;
  slot JSONB;
  wd SMALLINT;
  sm INT;
  em INT;
  open_t TEXT;
  close_t TEXT;
  sort_i INT;
BEGIN
  FOR r IN
    SELECT business_id, 'orders'::text AS module_id, hours
    FROM orders_settings
    WHERE hours IS NOT NULL AND hours <> '{}'::jsonb
    UNION ALL
    SELECT business_id, 'turnos'::text AS module_id, hours
    FROM turnos_settings
    WHERE hours IS NOT NULL AND hours <> '{}'::jsonb
  LOOP
    IF EXISTS (
      SELECT 1 FROM module_hours mh
      WHERE mh.business_id = r.business_id AND mh.module_id = r.module_id
    ) THEN
      CONTINUE;
    END IF;

    FOR day_key, day_val IN SELECT * FROM jsonb_each(r.hours)
    LOOP
      wd := tumo_weekday_from_key(day_key);
      IF wd IS NULL THEN
        CONTINUE;
      END IF;

      sort_i := 0;

      IF jsonb_typeof(day_val) = 'array' THEN
        FOR slot IN SELECT * FROM jsonb_array_elements(day_val)
        LOOP
          open_t := COALESCE(slot->>'open', slot->>'start', slot->>'from');
          close_t := COALESCE(slot->>'close', slot->>'end', slot->>'to');
          sm := tumo_parse_hhmm_to_minute(open_t);
          em := tumo_parse_hhmm_to_minute(close_t);
          IF sm IS NOT NULL AND em IS NOT NULL AND em > sm THEN
            INSERT INTO module_hours (business_id, module_id, weekday, start_minute, end_minute, sort_order)
            VALUES (r.business_id, r.module_id, wd, sm, em, sort_i);
            sort_i := sort_i + 1;
          END IF;
        END LOOP;
      ELSIF jsonb_typeof(day_val) = 'object' THEN
        open_t := COALESCE(day_val->>'open', day_val->>'start', day_val->>'from');
        close_t := COALESCE(day_val->>'close', day_val->>'end', day_val->>'to');
        sm := tumo_parse_hhmm_to_minute(open_t);
        em := tumo_parse_hhmm_to_minute(close_t);
        IF sm IS NOT NULL AND em IS NOT NULL AND em > sm THEN
          INSERT INTO module_hours (business_id, module_id, weekday, start_minute, end_minute, sort_order)
          VALUES (r.business_id, r.module_id, wd, sm, em, 0);
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- G) Empleados: roles + dueño 1 teléfono = 1 comercio; phone único por comercio
-- (developer puede repetir teléfono en varios comercios)
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees
  ADD CONSTRAINT employees_role_check
  CHECK (role IN ('owner', 'employee', 'admin', 'developer'));

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_phone_key;
DROP INDEX IF EXISTS employees_phone_key;

-- Unique (phone, business_id) si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_phone_business_id_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'employees_phone_business_id_key'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT employees_phone_business_id_key UNIQUE (phone, business_id);
  END IF;
END $$;

-- Dueño: un solo ownership por teléfono
CREATE UNIQUE INDEX IF NOT EXISTS employees_one_owner_per_phone_idx
  ON employees (phone)
  WHERE role = 'owner';

-- Comentarios de cajones (documentación viva)
COMMENT ON TABLE people IS 'Persona global por teléfono; autocomplete nombre/cumple entre comercios';
COMMENT ON TABLE loyalty_settings IS 'Programa de puntos 1:1 por comercio (fuera de businesses)';
COMMENT ON TABLE loyalty_point_ranges IS 'Franjas de puntos por monto; editable; sin solapes se valida en app';
COMMENT ON TABLE business_payment_profiles IS 'Alias/CBU base del comercio; módulos pueden override en su settings';
COMMENT ON TABLE module_hours IS 'Horarios por módulo con tramos partidos (weekday + start/end minute)';
COMMENT ON COLUMN customers.person_id IS 'FK a people; código/puntos/historial siguen por comercio';
COMMENT ON COLUMN customers.rewards_redeemed_count IS 'Premios canjeados (estrellita); saldo points se resetea en canje';
COMMENT ON COLUMN loyalty_settings.max_points_per_purchase IS 'Tope de puntos por compra (ej. Defe 80); null = sin tope';
