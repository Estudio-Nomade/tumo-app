---
title: 'Panel medio + insights de fidelización en el módulo'
type: 'feature'
created: '2026-08-05'
status: 'done'
baseline_commit: 'a810664'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El Panel del dueño está saturado de widgets de programa (meta, progreso a premio, ranking de canjes). Parece un home de Fidelización, no un panel de comercio.

**Approach:** Panel medio = KPIs de actividad (clientes + compras del mes) + “Clientes destacados” por volumen histórico de compras. Todo lo de programa (meta, cerca del premio, premios ganados, KPI premios) se mueve a `/dashboard/loyalty`.

## Boundaries & Constraints

**Always:**
- TDD; código EN; copy UI ES.
- Destacados: `ORDER BY total_purchases DESC` (histórico), no stamps ni canjes.
- Home sin GoalCard, sin listas de premio/canje, sin CTAs ops.
- Insights de programa en la página del módulo loyalty (server), encima de la caja ops.

**Ask First:** Cambiar schema; HTTP nuevo si no hace falta.

**Never:** Selector temporal; rehacer panel ops; trends inventados.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected |
|----------|-------|----------|
| Home con clientes | total_purchases > 0 | “Clientes destacados”, filas “N compras”, highlight link |
| Home vacío | 0 customers | empty QR copy; 2 KPIs en 0 |
| Home KPIs | metrics | solo Clientes + Compras del mes (no Premios) |
| Módulo loyalty | owner/staff | meta + cerca premio + premios ganados + KPI premios visibles |
| Destacados order | A 50 tot, B 10 tot | A antes que B |

</frozen-after-approval>

## Code Map

- `modules/loyalty/api/metrics.ts` — `getTopBuyers` (total_purchases); mantener getTopCustomers / byPrizes / weekly / count
- `modules/loyalty/dashboard/widgets.tsx` — HomeMetrics (2 cards), FeaturedCustomers; listas A/B y Goal intactos para módulo
- `modules/loyalty/dashboard/home-section.tsx` — wire medio
- `modules/loyalty/dashboard/module-insights.tsx` (nuevo) — server insights para /loyalty
- `app/(dashboard)/[slug]/dashboard/loyalty/page.tsx` — montar insights + panel
- `tests/loyalty-metrics.test.ts`, `tests/ui/dashboard-home.test.tsx` — RED/GREEN

## Tasks & Acceptance

**Execution:**
- [x] RED/GREEN `getTopBuyers` DI
- [x] RED/GREEN UI home: 2 KPIs, destacados, sin meta/premios lists
- [x] GREEN home-section wire
- [x] GREEN module-insights + loyalty page
- [x] `bun test` + `bun run build`

**Acceptance Criteria:**
- Given Panel, when abre, then ve Clientes + Compras del mes + Clientes destacados por total_purchases; no meta ni rankings de premio.
- Given /loyalty, when abre, then ve meta + cerca del premio + más premios ganados.
- Given click destacado, then `?highlight=id` en loyalty.
- Given tests/build, then verdes.

## Spec Change Log

## Design Notes

Default volumen = **histórico `total_purchases`** (user: “han comprado un montón”).

Home grid KPIs: `grid-cols-2`. Módulo puede mostrar `LoyaltyMetrics` completo (3) o al menos premios + goal + 2 listas.

## Verification

**Commands:**
- `bun test` — all pass
- `bun run build` — success
