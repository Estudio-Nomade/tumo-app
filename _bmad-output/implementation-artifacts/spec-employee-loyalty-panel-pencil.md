---
title: 'Panel empleado Fidelización (Pencil EDNqK)'
type: 'refactor'
created: '2026-08-04'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'eae013a'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El panel staff de fidelización es one-shot search+API; no matchea Pencil `EDNqK` (lista siempre visible, search live, botones verdes/dorados, sin bottom nav empleado).

**Approach:** Refactor UI de `panel.tsx` a lista mock filtrable + header negocio/logo + search con ícono + CTA código abajo; ocultar bottom nav cuando `role !== owner`. Sin tocar APIs.

## Boundaries & Constraints

**Always:**
- Mobile-first 375px, Tailwind, `var(--color-primary)`, Lucide.
- TDD; `bun test` + `bun run build` verdes.
- Mock ≥4 clientes; `addVisit`/`redeem` mutan estado local.
- Empleado: sin bottom nav; owner conserva el suyo.
- Toast de confirmación se mantiene.

**Ask First:** Reconectar fetch real a la lista; cambiar auth.

**Never:** Cambiar handlers API loyalty; romper panel owner/home.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error |
|----------|---------------|----------|-------|
| Load | mount | 500ms loading → 4 mock rows | — |
| Filter | query "mar" | solo María | empty: "No se encontraron clientes." |
| +1 compra | canRedeem false | purchases++ local, toast | — |
| Canjear | canRedeem true | purchases=0, toast premio | — |
| Código | 4 dígitos match | highlight/focus that customer | no match → error toast/msg |
| Employee nav | role employee | no bottom pill | desktop sidebar opcional modules |

</frozen-after-approval>

## Code Map

- `modules/loyalty/dashboard/panel.tsx` — refactor UI/estado mock
- `shell/layouts/dashboard-layout.tsx` — ocultar bottom nav si no owner
- `shell/context/business.tsx` — `useBusiness()` para nombre
- `app/(dashboard)/[slug]/dashboard/loyalty/page.tsx` — wrapper mínimo si hace falta
- `tests/ui/loyalty-panel.test.tsx` — **nuevo**
- `tests/ui/dashboard-nav.test.tsx` / `visual-tokens.test.tsx` — employee no bottom nav + panel tokens

## Tasks & Acceptance

**Execution:**
- [x] Tests RED panel: header negocio·Hoy, search sin Buscar, lista mock 4, botones verde/dorado, código keyboard
- [x] Implementar `panel.tsx` mock + UI Pencil
- [x] Layout: bottom nav solo `isOwner`; employee sin nav inferior (desktop: logout sigue)
- [x] Tests nav empleado + visual-tokens panel
- [x] `bun test` + `bun run build`

**Acceptance Criteria:**
- Given empleado, when abre loyalty, then ve lista mock filtrable y no ve bottom nav.
- Given filtro sin match, when escribe, then empty copy.
- Given +1/canje, when actúa, then estado local + toast, sin fetch.

## Spec Change Log

## Design Notes

Avatar colors cycle: `#FFF7ED`, `#FEF9C3`, `#F5F5F4`, `#EFF6FF`. Progress bar fixed ~88px. Code mode: toggle input 4 dígitos bajo header o sobre lista; match por `code`.

## Verification

**Commands:**
- `bun test` — all pass
- `bun run build` — success

## Suggested Review Order

**Panel empleado**

- Lista mock, search live, CTAs verde/dorado, código
  [`panel.tsx:1`](../../modules/loyalty/dashboard/panel.tsx#L1)

**Chrome**

- Bottom nav solo owner (`showBottomNav`)
  [`dashboard-layout.tsx:92`](../../shell/layouts/dashboard-layout.tsx#L92)

**Tests**

- filter + source Pencil
  [`loyalty-panel.test.tsx:1`](../../tests/ui/loyalty-panel.test.tsx#L1)
