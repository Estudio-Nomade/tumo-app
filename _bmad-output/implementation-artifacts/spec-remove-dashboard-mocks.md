---
title: 'Eliminar mocks dashboard/panel — datos reales'
type: 'bugfix'
created: '2026-08-04'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'c298122'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Panel empleado y home dueño muestran clientes/meta/trends inventados.

**Approach:** API `listCustomers` + top clientes y canjes semanales reales; panel fetch+purchase/redeem; home sin mocks ni trends falsos.

## Boundaries & Constraints

**Always:** Solo datos de DB/API. Empty states honestos. TDD + build/test.

**Never:** Hardcodear nombres de clientes, % trend o metas inventadas.

</frozen-after-approval>

## Code Map

- `modules/loyalty/api/customers.ts` — listCustomers
- `app/api/loyalty/customers/route.ts` — GET list auth
- `modules/loyalty/api/metrics.ts` — topCustomers, weekly redemptions
- `modules/loyalty/dashboard/panel.tsx` — real fetch
- `modules/loyalty/dashboard/widgets.tsx` — props reales
- `app/(dashboard)/[slug]/dashboard/page.tsx` — wire data
- tests

## Tasks & Acceptance

- [x] listCustomers + tests
- [x] panel sin MOCK, API real
- [x] home: métricas sin trend fake; GoalCard/TopCustomers solo si hay datos reales
- [x] bun test + build

## Verification

- `bun test` / `bun run build`
