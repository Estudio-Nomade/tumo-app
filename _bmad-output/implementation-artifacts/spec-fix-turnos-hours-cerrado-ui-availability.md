---
title: 'fix(turnos): hours jsonb object + switch Abierto|Cerrado + fecha local'
type: 'bugfix'
created: '2026-09-07'
status: 'done'
baseline_commit: '7b41bbf16253365795a3101955603425fc95d573'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** (1) En ajustes Turnos el label fijo dice “Cerrado” mientras el switch verde = día abierto → confunde. (2) Tras guardar franjas, availability no ofrece slots (ej. mañana 09:00) porque `hours` se persiste como jsonb **string** (`JSON.stringify` + cast) y `generateSlots` indexa como objeto.

**Approach:** Persistir `hours` con `sql.json` (objeto jsonb), normalizar hours string→objeto en lectura/availability, UI con texto dinámico Abierto|Cerrado (verde=abierto), y `nextDays` con YYYY-MM-DD local.

## Boundaries & Constraints

**Always:**
- Demo solo `tumo-lab`; BMAD + TDD; verde = abierto/atiende; gris = cerrado.
- Persistencia hours vía `sql.json` sin `JSON.stringify` manual ni `::jsonb` mágico.
- Coerción de hours string/basura → `HoursMap` usable en getSettings y generateSlots.
- Cero imports `modules/turnos` ↔ `modules/orders`.

**Ask First:** Cambiar semántica global a “verde=cerrado”; tocar Orders hours UI.

**Never:** MercadoPago, multi-sillón, overnight, null-grid, reescribir wizard completo, ABM servicios, activar turnos en `carri`, secrets/`.env*`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Persist hours | upsert hours map mon 09–18 | bound value es `sql.json(object)`, no string JSON | throw si falta `sql.json` |
| Read string hours | getSettings row hours = JSON string | settings.hours es objeto con mon | basura → `{}` |
| Slots from string | generateSlots hours string mon 09–18, day lunes | incluye `09:00` | string inválido → [] |
| UI estado | day.closed false/true | texto “Abierto”/“Cerrado”; verde solo abierto | N/A |
| Fecha local | Date local cerca medianoche AR | iso = Y-M-D de getFullYear/Month/Date | N/A |

</frozen-after-approval>

## Code Map

- `modules/turnos/api/settings.ts` — upsert con JSON.stringify (bug); mapSettings sin coerce
- `modules/turnos/lib/types.ts` — SqlTagged sin `json`
- `modules/turnos/lib/availability.ts` — generateSlots asume objeto
- `modules/turnos/lib/hours-editor.ts` — coerceHoursMap privado (exportar o compartir)
- `modules/turnos/dashboard/turnos-hours-editor.tsx` — label fijo “Cerrado”
- `modules/turnos/public/booking-wizard.tsx` — nextDays toISOString
- `app/api/turnos/availability/route.ts` — pasa hours crudo
- `tests/turnos-settings.test.ts`, `tests/turnos-availability.test.ts`, `tests/turnos-hours-editor.test.ts`

## Tasks & Acceptance

**Execution:**
- [x] `modules/turnos/lib/types.ts` + `availability.ts` — `sql.json` en SqlTagged; export `coerceHoursMap`; generateSlots coerce hours
- [x] `modules/turnos/api/settings.ts` — upsert `sql.json(hours)`; mapSettings coerce
- [x] `modules/turnos/lib/hours-editor.ts` — reusar coerce exportado
- [x] `modules/turnos/dashboard/turnos-hours-editor.tsx` — Abierto|Cerrado dinámico; aria-checked=!closed
- [x] `modules/turnos/public/booking-wizard.tsx` — localDateIso helper
- [x] Tests settings/availability/hours-editor/wizard contract — TDD red→green

**Acceptance Criteria:**
- Given hours double-encoded string en DB, when getSettings/generateSlots, then objeto usable y slot 09:00 en lunes abierto
- Given upsert hours, when bind SQL, then `sql.json(object)` no string + no `::jsonb` en query
- Given día abierto/cerrado en UI, when render, then label Abierto|Cerrado alineado a color (verde=abierto)
- Given nextDays, when arma ISO, then calendario local no UTC slice

## Spec Change Log

## Design Notes

Confirmado en local tumo-lab: `jsonb_typeof(hours)='string'`. Modelo UI: texto de estado + verde solo en Abierto (no invertir semántica producto).

## Verification

**Commands:**
- `bun test tests/turnos-hours-editor.test.ts tests/turnos-settings.test.ts tests/turnos-availability.test.ts tests/turnos-bookings.test.ts` — all pass
- `bunx eslint` paths tocados — clean

**Manual checks:**
- SQL `jsonb_typeof(hours)='object'` tras save
- availability mon 09:00 presente

## Suggested Review Order

**Persistencia hours (root cause H1)**

- `sql.json(hours)` en vez de `JSON.stringify` + `::jsonb`
  [`settings.ts:112`](../../modules/turnos/api/settings.ts#L112)

- Lectura siempre coerce string→objeto
  [`settings.ts:26`](../../modules/turnos/api/settings.ts#L26)

- `coerceHoursMap` + generateSlots defensivo
  [`availability.ts:14`](../../modules/turnos/lib/availability.ts#L14)

**UI Abierto|Cerrado**

- Label dinámico + verde solo abierto + aria-checked abierto
  [`turnos-hours-editor.tsx:91`](../../modules/turnos/dashboard/turnos-hours-editor.tsx#L91)

**Fecha local wizard**

- `localDateIso` evita UTC slice en AR
  [`booking-wizard.tsx:27`](../../modules/turnos/public/booking-wizard.tsx#L27)

**Tests**

- Contrato sql.json + coerce + UI Abierto
  [`turnos-settings.test.ts`](../../tests/turnos-settings.test.ts)
  [`turnos-availability.test.ts`](../../tests/turnos-availability.test.ts)
  [`turnos-hours-editor.test.ts`](../../tests/turnos-hours-editor.test.ts)
