# Normalización de base Tumo (dev / Supabase migrations)

> **For Hermes:** Implementar por fases expand-contract. No tocar prod en este plan.

**Goal:** Separar cajones de datos mezclados (comercio vs puntos vs módulos vs personas vs horarios vs alias) sin perder datos, con migraciones en repo aplicables al Supabase local Tumo (dev).

**Architecture:** Expand-contract. Fase 016 crea tablas nuevas + backfill + constraints nuevas; deja columnas viejas legibles por la app. Fases siguientes (017+) re-pointean lecturas/escrituras y recién después dropean legacy.

**Tech Stack:** Postgres/Supabase local (`:54322`), `shell/db/migrations/*` + `supabase/migrations/*`, tests `bun test` estilo static SQL (como 004/009).

**Reglas de producto cerradas:**
- 1 programa de puntos por comercio; franjas editables; tope por compra; canje → saldo 0 + premio ganado (estrellita via contador/historial).
- Franjas Defe de referencia (app/seed, no hardcode global en schema salvo defaults).
- Saldo visible al toque (cache en ficha cliente-comercio).
- Persona por teléfono: autocomplete nombre/cumple; código/puntos/historial por comercio.
- Dueño: 1 teléfono = 1 comercio (no dos ownerships).
- Developer: puede estar en varios comercios (mismo teléfono).
- Alias: base del comercio; al cargar se ve en módulos activos; luego editable por módulo.
- Horarios siempre por módulo, con tramos partidos.
- Criterio listo: prolijo a futuro. Alcance: todo Tumo (schema primero).

---

## Fase 016 — Expand (esta entrega)

### Task 1: Test estático de migración 016 (RED)

**Files:**
- Create: `tests/db-normalization-016.test.ts`
- Create: `shell/db/migrations/016_schema_normalization_expand.sql`
- Create: `supabase/migrations/20260911120000_schema_normalization_expand.sql` (mismo SQL)
- Modify: `shell/db/migrate.ts` (registrar 016)

### Task 2: SQL expand + backfill

Tablas nuevas:
1. `people` — phone UNIQUE, name, birthday
2. `loyalty_settings` — 1:1 business (points_needed, reward_name, max_points_per_purchase)
3. `loyalty_point_ranges` — franjas tabulares
4. `business_payment_profiles` — alias/cbu/holder del comercio
5. `module_hours` — business_id, module_id, weekday, start_minute, end_minute, sort

Alter:
- `customers.person_id` → people; `rewards_redeemed_count INT DEFAULT 0`
- `employees`: role incluye `developer`; drop unique global phone; unique (phone, business_id); unique parcial phone WHERE role='owner'
- backfill people desde customers (DISTINCT ON phone)
- backfill loyalty_* desde businesses
- backfill payment profile desde coalesce(orders_settings, turnos_settings)
- backfill module_hours desde hours JSONB de orders/turnos si shape lo permite; si no, tabla vacía + hours JSONB sigue vivo
- NO drop de columns legacy en 016

### Task 3: Aplicar en dev local Tumo

```bash
# vía shell migrate o psql contra 54322
```

### Task 4: Verificar \d y counts backfill

---

## Fuera de 016 (siguiente)

- App lee loyalty_settings / people / module_hours
- Seed Defe con franjas reales + max 80 + points_needed 150
- Drop active_modules / points_* de businesses cuando app no los use
- Contract migrations

---

## Verification

```bash
export PATH="$HOME/.bun/bin:$PATH"
bun test tests/db-normalization-016.test.ts
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c '\dt' 
```
