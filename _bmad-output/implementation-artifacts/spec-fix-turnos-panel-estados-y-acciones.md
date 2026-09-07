---
title: 'fix(turnos): labels ES panel + acciones detalle vía PATCH'
type: 'bugfix'
created: '2026-09-07'
status: 'done'
baseline_commit: 'fe17e4d4f38bb3d028d8cd82b09cbc4ca4a94041'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** En panel admin Turnos los estados salen crudos (`pending`, `pending_verification`) y los botones del detalle no actualizan la UI (server actions sin revalidate/feedback).

**Approach:** Helpers de labels ES-AR; listado/detalle con badges legibles; detalle client + PATCH autenticado (como Pedidos) con gating, error visible y refresh de estado.

## Boundaries & Constraints

**Always:** Labels ES de la tabla D1; PATCH con session_token; domain payments/bookings existentes; cero import orders; demo tumo-lab.

**Ask First:** Cambiar enums DB; mostrar receipt image (nice-to-have).

**Never:** MercadoPago, WA push, hours editor, carri turnos, secrets.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected | Error |
|----------|-------|----------|-------|
| Labels booking | pending/confirmed/completed/cancelled | Reservado/Confirmado/Atendido/Cancelado | fallback código |
| Labels pago transfer | pending_verification | Revisar comprobante | — |
| PATCH complete | session ok + id | status completed + body booking | 401/404 |
| PATCH reject | reason vacío | 400 motivo | UI error |
| Gating | completed/cancelled | sin CTAs primarios | solo lectura |

</frozen-after-approval>

## Code Map

- `modules/turnos/lib/status-labels.ts` — NUEVO
- `modules/turnos/dashboard/panel.tsx` — badges
- `modules/turnos/dashboard/booking-detail.tsx` — NUEVO client
- `app/(dashboard)/[slug]/dashboard/turnos/[id]/page.tsx` — thin shell
- `app/api/turnos/bookings/[id]/route.ts` — + PATCH
- `modules/turnos/api/bookings.ts` — JOIN customer en getBooking
- `modules/orders/dashboard/order-detail.tsx` — REFERENCIA

## Tasks & Acceptance

**Execution:**
- [x] `status-labels.ts` + tests
- [x] panel badges ES
- [x] PATCH route admin actions
- [x] booking-detail client + page thin
- [x] getBooking customer name/phone
- [x] tests + eslint

## Suggested Review Order

**Labels**
- [`status-labels.ts:1`](../../modules/turnos/lib/status-labels.ts#L1)

**PATCH API**
- [`route.ts:PATCH`](../../app/api/turnos/bookings/[id]/route.ts#L35)

**Detalle client**
- [`booking-detail.tsx:1`](../../modules/turnos/dashboard/booking-detail.tsx#L1)

**Lista badges**
- [`panel.tsx`](../../modules/turnos/dashboard/panel.tsx)


**Acceptance Criteria:**
- Given lista/detalle, when render, then labels ES no snake_case crudo
- Given Marcar atendido, when PATCH ok, then UI muestra Atendido sin hard-refresh manual
- Given Aprobar/Rechazar/Cancelar/Marcar pagado, when ok, then badges y gating actualizan; error visible si falla

## Spec Change Log

## Design Notes

Prefer PATCH+client over server-action revalidate. Gating: complete/cancel if not terminal; approve/reject if transfer+pending_verification; mark_paid_local if at_location + not paid + not cancelled.

## Verification

**Commands:**
- `bun test tests/turnos-status-labels.test.ts tests/turnos-bookings.test.ts tests/turnos-payments.test.ts`
- eslint paths tocados

**Manual:** tumo-lab panel → badges ES → detalle acciones → UI refresh
