---
title: 'loyalty-qr-scan-points'
type: 'feature'
created: '2026-08-18'
status: 'done'
baseline_commit: 'e6fc994'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-tumo-app-2026-08-18/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/brainstorming/brainstorm-loyalty-qr-scan-flow-2026-08-18/brainstorm-intent.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** En el POS, encontrar al cliente (tipear código / buscar) frena la venta; el modelo “+1 compra” no refleja montos ni rangos de puntos del negocio.

**Approach:** Modelo puntos-nativo + rangos configurables; QR del cliente (URL pública); scanner in-app como vista principal del panel; bottom sheet scan→tramos→confirmar (+ canje); código 4 dígitos como plan B.

## Boundaries & Constraints

**Always:**
- Seguir ADs del spine `loyalty-qr-scan-points` (AD-1…AD-12, 3a, 10a).
- TDD: test rojo antes de implementar cada capa (domain → route → UI).
- Earn body only `{ customerId, rangeIndex, force?, expectedPoints? }`; server resuelve banda.
- Mutaciones earn/redeem en una tx con `SELECT … FOR UPDATE` del customer.
- Acciones solo con sesión employee/owner del mismo `businessId`.
- QR payload exacto: `/{slug}/loyalty/c/{code}` (`code` = `customers.code`).
- Un ledger: `point_movements` (`kind` earn|redeem); dropear tabla `redemptions`.
- Montos en centavos enteros; UI formatea.
- Sheet = `components/ui/sheet.tsx` `side="bottom"`; scanner = `@yudiel/react-qr-scanner@2.6.0`.
- Anti-dupe: último earn <60s sin `force` → `409 DUPLICATE_RECENT`; client debounce 2s post-ok.
- Copy UI en español (“puntos”); identificadores de código en inglés.

**Ask First:**
- Cualquier desvío del spine (otra lib scanner, mantener tabla redemptions, body freeform points).
- Migración destructiva más allá de renames/drop redemptions/purchases→point_movements.
- Cambiar auth/sesión employee o cookies `client_id`.

**Never:**
- Undo / auto-carga 0-tap / confetti / realtime / QR dinámico / kiosco / Wallet (fase 2–3).
- Instalar vaul/drawer; inventar segundo bottom-sheet.
- Dual-write compras+puntos o capa compat.
- Float money; confiar points del cliente en earn.
- Borrar plan B código 4 dígitos.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error |
|----------|---------------|----------|-------|
| Earn happy | session ok, `rangeIndex` banda `points>0`, no earn <60s | tx: points+=N, total_points+=N, movement earn; 200 + customer | N/A |
| Earn bad index / 0-pt band | `rangeIndex` inválido o points≤0 | no mutate | 400 |
| Earn stale range | `expectedPoints` ≠ band.points | no mutate | 409 `RANGE_CHANGED` |
| Earn dupe | last earn same cust+biz <60s, no force | no mutate | 409 `DUPLICATE_RECENT` |
| Earn force | same + `force:true` | earn ok | N/A |
| Earn wrong biz / no session | foreign customer or no cookie | no mutate | 404/401 |
| Redeem ok | points ≥ points_needed | tx: points=0, movement redeem (magnitude=prev); total_points unchanged | N/A |
| Redeem below | points < needed | no mutate | 400 |
| Program ranges invalid | gaps/overlaps/no open last/multi 0-pt | no save | 400 |
| Program ok | contiguous ranges + points_needed + reward_name | businesses updated | N/A |
| Scanner foreign QR | non-canonical URL | friendly error, keep scanning | N/A |
| Deep link employee | `/{slug}/loyalty/c/{code}` + session same biz | redirect dashboard `?c=` → sheet | N/A |
| Deep link public | same URL no session | read-only card by code | N/A |
| Below-min purchase | only 0-pt bands | picker hides them; no earn path | N/A |

</frozen-after-approval>

## Code Map

- `shell/db/migrations/003_loyalty_points_native.sql` -- NEW: renames, point_ranges, point_movements, DROP redemptions
- `lib/modules.ts` -- Business: points_needed, point_ranges
- `shell/db/business.ts` -- updateBusinessProgram + SELECTs
- `modules/loyalty/lib/types.ts` -- CustomerRow points*; PointRange type
- `modules/loyalty/lib/default-deps.ts` -- points deps; SELECT columns
- `modules/loyalty/lib/parse-loyalty-qr.ts` -- NEW: URL → {slug,code}|null
- `modules/loyalty/api/points.ts` -- NEW (replace purchases.ts earn)
- `modules/loyalty/api/redemptions.ts` -- ledger-only redeem + threshold + tx
- `modules/loyalty/api/program.ts` -- validate/save point_ranges + points_needed
- `modules/loyalty/api/customers.ts` -- points fields; canRedeem
- `app/api/loyalty/points/route.ts` -- NEW POST
- `app/api/loyalty/purchases/route.ts` -- DELETE
- `app/api/loyalty/redemptions/route.ts` -- wire updated handler
- `app/api/loyalty/program/route.ts` -- body fields
- `app/(public)/[slug]/loyalty/c/[code]/page.tsx` -- NEW deep link
- `app/(dashboard)/[slug]/dashboard/loyalty/page.tsx` -- pass ?c= / scanner default
- `modules/loyalty/dashboard/loyalty-scanner.tsx` -- NEW
- `modules/loyalty/dashboard/customer-action-sheet.tsx` -- NEW sheet flow
- `modules/loyalty/dashboard/panel.tsx` -- scanner primary; plan B code/list
- `modules/loyalty/dashboard/program-form.tsx` -- ranges editor
- `modules/loyalty/public/card.tsx` -- points + customer QR
- `modules/loyalty/dashboard/loyalty-qr-view.tsx` / share helpers -- unchanged program QR unless column rename breaks
- `tests/loyalty-purchases.test.ts` → `tests/loyalty-points.test.ts`
- `tests/loyalty-redemptions.test.ts` -- rewrite
- `tests/loyalty-program-ranges.test.ts` -- NEW validation
- `tests/ui/loyalty-panel.test.tsx`, `settings-program-forms.test.tsx`, `branded-qr` if needed -- update asserts
- `package.json` -- add `@yudiel/react-qr-scanner@2.6.0`

## Tasks & Acceptance

**Execution:**
- [x] `tests/loyalty-points.test.ts` + `modules/loyalty/api/points.ts` -- TDD earn (happy, 400 index, 409 dupe/force, 409 RANGE_CHANGED, FOR UPDATE tx, movement row)
- [x] `tests/loyalty-redemptions.test.ts` + `api/redemptions.ts` -- TDD redeem threshold, points=0, movement redeem, no redemptions table
- [x] `tests/loyalty-program-ranges.test.ts` + `api/program.ts` + `shell/db/business.ts` + `lib/modules.ts` -- TDD range validation + points_needed
- [x] `shell/db/migrations/003_loyalty_points_native.sql` -- schema cutover
- [x] `modules/loyalty/api/customers.ts` + `default-deps.ts` -- points DTO/columns; delete purchases API/route
- [x] `app/api/loyalty/points/route.ts` + update redemptions/program routes -- HTTP wiring + auth
- [x] `lib/parse-loyalty-qr.ts` + unit test -- canonical parse/reject
- [x] `loyalty-scanner.tsx` + `customer-action-sheet.tsx` + `panel.tsx` -- scanner default, sheet flow, plan B link, ?c= open sheet
- [x] `program-form.tsx` -- chained ranges editor + points_needed/reward_name
- [x] `public/card.tsx` + `app/.../loyalty/c/[code]/page.tsx` -- customer QR; deep link public vs employee redirect
- [x] Update UI/domain tests that still say purchases/+1 compra/purchases_needed
- [x] `bun install` scanner dep; run full loyalty-related test suite + lint

**Acceptance Criteria:**
- Given employee session, when scans valid customer QR (or opens `?c=`), then bottom sheet shows name + progress and range buttons with points>0 only.
- Given sheet confirm on a range, when POST points succeeds, then customer points increase by band.points and a point_movements earn exists.
- Given last earn <60s, when confirm without force, then 409 and UI offers extra confirm; with force, earn succeeds.
- Given points ≥ points_needed, when redeem from sheet, then points become 0 and redeem movement is written; below threshold, 400.
- Given owner edits program ranges with a gap, when save, then 400; contiguous valid ranges persist on businesses.point_ranges.
- Given public user opens `/{slug}/loyalty/c/{code}`, when no employee session, then read-only card with QR encoding that same URL; with employee session same biz, redirect to dashboard sheet.
- Given scanner sees non-loyalty QR, when decode, then friendly error and camera keeps running.
- Given “¿No funciona el QR?”, when used, then existing 4-digit code lookup still works.
- Given migration 003 applied on empty/dev DB, when app runs, then no references to purchases/redemptions tables or purchases_needed columns remain in loyalty paths.

## Spec Change Log

## Design Notes

**Earn (domain sketch):**
```ts
// body: { customerId, rangeIndex, force?, expectedPoints? }
// 1) load business.point_ranges[rangeIndex] → band
// 2) if !band || band.points<=0 → 400
// 3) if expectedPoints!=null && expectedPoints!==band.points → 409 RANGE_CHANGED
// 4) BEGIN; SELECT customer FOR UPDATE (biz scope)
// 5) if !force && last earn <60s → 409 DUPLICATE_RECENT
// 6) UPDATE points/total_points; INSERT movement earn; COMMIT
```

**Range label:** e.g. `max_cents==null ? \`${min/100}+\` : \`${min/100}–${max/100}\`` (display pesos).

**Default point_ranges on migrate:** single open band `{min_cents:0,max_cents:null,points:1}` so existing “+1” mental model works until owner configures Omar-style cuts — or require configure; prefer seed one band points=1 min=0 open so earn isn’t blocked.

## Verification

**Commands:**
- `bun test tests/loyalty-points.test.ts tests/loyalty-redemptions.test.ts tests/loyalty-program-ranges.test.ts` -- all pass
- `bun test tests/ui/loyalty-panel.test.tsx tests/ui/settings-program-forms.test.tsx` -- all pass
- `bun test` -- full suite green (or only loyalty failures pre-existing documented)
- `bun run lint` -- no new errors on touched files

**Manual checks:**
- Phone/browser: employee dashboard opens camera; scan card QR → sheet → sumar → toast; card shows new points after refresh/poll.
- Public card shows scannable QR; employee deep link opens sheet.


## Suggested Review Order

**Earn domain**

- Server-only range resolution + anti-dupe + tx
  [`points.ts:1`](../../modules/loyalty/api/points.ts#L1)

- HTTP body validation for rangeIndex
  [`route.ts:1`](../../app/api/loyalty/points/route.ts#L1)

**Schema cutover**

- Idempotent rename to points / point_movements
  [`003_loyalty_points_native.sql:1`](../../shell/db/migrations/003_loyalty_points_native.sql#L1)

**Redeem + program**

- Threshold guard + ledger redeem movement
  [`redemptions.ts:1`](../../modules/loyalty/api/redemptions.ts#L1)

- Contiguous point_ranges validation
  [`program.ts:1`](../../modules/loyalty/api/program.ts#L1)

**Employee UX**

- Scanner default + plan B + deep-link `?c=`
  [`panel.tsx:1`](../../modules/loyalty/dashboard/panel.tsx#L1)

- Bottom sheet: ranges → confirm → dupe
  [`customer-action-sheet.tsx:1`](../../modules/loyalty/dashboard/customer-action-sheet.tsx#L1)

- Camera parse of canonical QR URL
  [`loyalty-scanner.tsx:1`](../../modules/loyalty/dashboard/loyalty-scanner.tsx#L1)

**Public card + deep link**

- Customer QR on card
  [`card.tsx:1`](../../modules/loyalty/public/card.tsx#L1)

- Employee session → dashboard sheet
  [`page.tsx:1`](../../app/(public)/[slug]/loyalty/c/[code]/page.tsx#L1)

**Ranges editor**

- Owner chained cuts UI
  [`program-form.tsx:1`](../../modules/loyalty/dashboard/program-form.tsx#L1)

**Tests**

- Domain TDD suite
  [`loyalty-points.test.ts:1`](../../tests/loyalty-points.test.ts#L1)
