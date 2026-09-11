# Inventario de cajones — normalización Tumo

Fecha: 2026-09-11  
Estado schema: **Fase 016 expand aplicada en Supabase local Tumo (dev)**.  
Prod: no tocada.

## Reglas de negocio cerradas

| Tema | Decisión |
|------|----------|
| Programa de puntos | 1 por comercio |
| Franjas | Editables; Defe de referencia (5/10/18/28/40; tope 80/compra; premio 150 pts = 20% off efectivo/transfer) |
| “De 10 en 10” | **Descartado** |
| Saldo | Visible al toque (cache en ficha cliente-comercio) |
| Canje | Saldo → 0; premios ganados se cuentan (estrellita) |
| Cliente multi-local | Mismo teléfono → autocomplete nombre/cumple; código/puntos/historial **por comercio** |
| Dueño | **1 teléfono = 1 comercio** (no dos ownerships) |
| Developer | Puede estar en varios comercios con el mismo teléfono |
| Alias | Base del comercio; se ve en módulos; override por módulo después |
| Horarios | Siempre por módulo; tramos partidos permitidos |
| Alcance | Todo Tumo (schema primero) |
| Criterio listo | Prolijo a futuro |
| Aplicación | Migraciones Supabase + shell; solo dev ahora |

## Cajones → tablas

| Cajón | Tabla(s) | Notas 016 |
|-------|----------|-----------|
| A Comercio | `businesses` | Sigue con columns legacy (points_*, active_modules) hasta contract |
| B Módulos contratados | `business_module_subscriptions` | Ya existía (015) |
| C Programa de puntos | `loyalty_settings` + `loyalty_point_ranges` | **Nuevo**; backfill desde businesses |
| D Persona | `people` | **Nuevo**; phone unique |
| E Cliente en comercio | `customers` (+ `person_id`, `rewards_redeemed_count`) | points/total_points siguen (cache) |
| F Movimientos puntos | `point_movements` | Sin cambio estructural |
| G Empleados | `employees` | role `developer`; unique (phone, business_id); unique parcial owner phone |
| H Sesiones | `sessions`, `admin_sessions` | Sin cambio |
| I Alias base | `business_payment_profiles` | **Nuevo**; backfill + sync a settings vacíos |
| J Config pedidos | `orders_settings` | hours JSONB legacy vivo |
| K Catálogo | products* | Sin cambio |
| L–N Pedidos/pagos | orders* | Snapshots se mantienen |
| O–R Turnos | turnos_* | Snapshots se mantienen |
| S Horarios normalizados | `module_hours` | **Nuevo**; backfill best-effort desde JSONB |
| T Billing Tumo | `business_billing*` | Sin cambio en 016 |
| U Admin Tumo | `admin_users` | Sin cambio |

## Archivos

- Plan: `docs/superpowers/plans/2026-09-11-db-normalization.md`
- SQL shell: `shell/db/migrations/016_schema_normalization_expand.sql`
- SQL supabase: `supabase/migrations/20260911120000_schema_normalization_expand.sql`
- Registro: `shell/db/migrate.ts`
- Tests: `tests/db-normalization-016.test.ts` (9 pass)

## Próximo (no hecho)

1. App lee `loyalty_settings` / `people` / `module_hours` / payment profile  
2. Seed Defe con franjas reales + max 80 + points_needed 150  
3. Escrituras duales  
4. Contract: drop columns legacy en businesses cuando nada las use  
5. Prod en paso separado  
