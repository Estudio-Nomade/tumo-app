---
title: 'feat(turnos): editor de horarios + Ajustes/WA visibles + no clobber hours'
type: 'feature'
created: '2026-09-07'
status: 'in-review'
review_loop_iteration: 0
baseline_commit: 'f59cc69bff7e630056ac9a9973e7abc3cfaf9a23'
context:
  - '{project-root}/docs/handoffs/PROMPT-feat-turnos-hours-editor-whatsapp-ux.md'
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El admin de Turnos no puede editar días/horarios de agenda (no hay UI); al guardar alias/CBU/WA el form pisa `hours` con un hardcode mon–sáb; la entrada a ajustes es solo ⚙ y el WhatsApp del negocio no se entiende como destino wa.me del cliente.

**Approach:** Editor de 7 días (1 franja) en la misma página de ajustes, state de `HoursMap` hidratado del GET y mandado al PUT (o omitido), label “Ajustes” en panel, copy claro de WA + 1 línea de ocupación de slots; TDD helpers + tests de merge/availability.

## Boundaries & Constraints

**Always:**
- Shape turnos: `HoursMap` = `Partial<Record<"sun"|"mon"|…|"sat", Array<[string,string]>>>` (día ausente o `[]` = cerrado).
- Una franja v1 por día al editar (`[[open,close]]`); same-day only (cierra > abre).
- Guardar sin hardcode de hours; si `hours` undefined en upsert, preservar DB.
- Demo/QA en `tumo-lab`; no tocar `carri` active_modules.
- BMAD + TDD; stage paths explícitos; sin PR hasta OK localhost.
- Copy ES-AR llano (elderly-friendly).

**Ask First:**
- Seed de un WhatsApp real en tumo-lab.
- Split a subruta `/turnos/horarios` si la página queda kilométrica (preferir misma página).

**Never:**
- Importar `modules/orders/**` ni unificar schemas hours.
- Grilla de celdas null en DB / multi-sillón / overnight / multi-ventana UI v1.
- Authyo push, templates Meta, MercadoPago, activar turnos en carri.
- Reescribir wizard público completo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Load settings | GET con hours DB | Form muestra días abiertos/cerrados y franjas reales | Missing day → cerrado |
| Save transfer only | PUT sin hours o hours del state | hours en DB intactos (no hardcode mon–sáb) | N/A |
| Save hours | Día abierto 10:00–14:00 | `hours.wed = [["10:00","14:00"]]` persistido | cierra ≤ abre → error visible, no PUT |
| Close day | Toggle cerrado | omit key o `[]` para ese día | N/A |
| Multi-window DB | Día con N>1 ventanas | UI muestra 1ª; al editar/guardar ese día colapsa a 1 franja; no tocar otros días | warning opcional 1 línea |
| Occupancy | Booking no cancelled overlaps slot | `generateSlots` no ofrece ese start; create 409 | copy: grilla libre se oculta sola al reservar |
| Cancel booking | status cancelled | slot vuelve si sigue en ventana | N/A |
| WA empty | whatsappPhone null | confirmación sin CTA; banner opcional en ajustes | N/A |
| WA filled | dígitos válidos | CTA wa.me en confirmación (ya existe) | N/A |

</frozen-after-approval>

## Code Map

- `modules/turnos/dashboard/settings-form.tsx` -- form ajustes; HOY hardcode hours L44–51; agregar state hours + montar editor + copy WA
- `modules/turnos/dashboard/panel.tsx` -- link ⚙ → label “Ajustes”
- `modules/turnos/dashboard/turnos-hours-editor.tsx` -- NUEVO UI 7 filas (patrón UX orders, sin import)
- `modules/turnos/lib/hours-editor.ts` -- NUEVO helpers DAY_ORDER, hoursToEditorState, editorStateToHours, validateTurnosDayWindow
- `modules/turnos/lib/availability.ts` -- HoursMap exportado; generateSlots (no romper)
- `modules/turnos/api/settings.ts` -- upsert merge si hours undefined (ya OK; testear)
- `app/api/turnos/settings/route.ts` -- PUT owner body passthrough
- `app/(dashboard)/[slug]/dashboard/turnos/ajustes/page.tsx` -- page shell (sin cambio salvo sea necesario)
- `modules/orders/dashboard/hours-editor.tsx` -- REFERENCIA visual only
- `tests/turnos-hours-editor.test.ts` -- NUEVO helpers + source contracts
- `tests/turnos-settings.test.ts` -- extender merge hours undefined / replace
- `tests/turnos-availability.test.ts` -- regresión occupancy cancelled vs active
- `tests/turnos-whatsapp.test.ts` -- no romper

## Tasks & Acceptance

**Execution:**
- [x] `tests/turnos-hours-editor.test.ts` -- RED helpers convert/validate + contracts textos Lunes/Cerrado/Abre/Cierra y anti-hardcode payload -- TDD story 1–2
- [x] `tests/turnos-settings.test.ts` -- RED upsert hours undefined preserves; explicit hours replaces -- story 1
- [x] `tests/turnos-availability.test.ts` -- RED/extend booking activo saca slot; cancelled no -- story 3
- [x] `modules/turnos/lib/hours-editor.ts` -- GREEN helpers mon…sun ES-AR, 1 franja, validate open<close -- sin import orders
- [x] `modules/turnos/dashboard/turnos-hours-editor.tsx` -- GREEN 7 filas toggle + time + copy ocupación 1 línea
- [x] `modules/turnos/dashboard/settings-form.tsx` -- GREEN hidratar hours del GET; save manda state o omite; sección Contacto WA + helper wa.me no push; banner si WA vacío
- [x] `modules/turnos/dashboard/panel.tsx` -- GREEN link “Ajustes” min-h 48px legible (no solo ⚙)
- [x] Source contracts panel “Ajustes” + href `.../turnos/ajustes`; form sin literal hardcode mon: [["09:00","18:00"]] como único payload fijo
- [x] Verify bun test + eslint paths tocados

**Acceptance Criteria:**
- Given owner tumo-lab en panel Turnos, when mira header/acciones, then ve entrada clara **Ajustes** (no solo ⚙ opaco).
- Given ajustes, when edita lun–vie 10–14 y cierra sáb/dom y guarda, then GET posterior refleja esas hours y cliente `/turnos/reservar` solo ofrece esas ventanas.
- Given hours custom en DB, when guarda solo alias/WA/pausa, then hours no vuelven al hardcode mon–sáb 09–18.
- Given reserva no cancelled en un slot, when se pide availability ese día, then ese start no aparece; cancelar lo devuelve si sigue en ventana.
- Given campo WA, when lee helper, then entiende que el cliente abre wa.me (no envío automático).
- Given codebase, when se busca imports, then cero `modules/turnos` ↔ `modules/orders`.

## Design Notes

**Editor state (interno UI):** por día `{ closed: boolean, open: string, close: string }`.  
**Serialize:** cerrado → omit key o `[]`; abierto → `[[open, close]]`. Defaults al reabrir: `09:00`–`18:00`.

**Multi-ventana existente:** al hidratar, tomar `windows[0]`; si `length > 1` y el user edita ese día, colapsar a una sola al guardar ese día; no reescribir otros días.

**Save:** un solo “Guardar ajustes” con payload que incluye `hours` del state actual (preferido) — nunca el objeto hardcodeado.

**Copy ocupación (ajustes, 1 línea):** “Los horarios que cargues acá son la grilla libre. Cuando un cliente reserva, ese horario deja de ofrecerse solo.”

**Copy WA:** “Número donde el cliente te avisa por WhatsApp al reservar (se abre un chat con los datos del turno). No es envío automático.”

## Verification

**Commands:**
```bash
export PATH="$HOME/.bun/bin:$PATH"
bun test \
  tests/turnos-hours-editor.test.ts \
  tests/turnos-settings.test.ts \
  tests/turnos-availability.test.ts \
  tests/turnos-whatsapp.test.ts \
  tests/turnos-bookings.test.ts

bunx eslint \
  modules/turnos/dashboard/settings-form.tsx \
  modules/turnos/dashboard/panel.tsx \
  modules/turnos/dashboard/turnos-hours-editor.tsx \
  modules/turnos/lib/hours-editor.ts \
  modules/turnos/api/settings.ts \
  modules/turnos/lib/availability.ts
```
expected: all pass; eslint clean

**Manual (localhost tumo-lab, no PR hasta OK):**
1. `/tumo-lab/dashboard/turnos` → Ajustes legible
2. Set lun–vie 10:00–14:00, sáb/dom cerrados, WA demo si humano lo pide; Guardar; hard refresh → persiste
3. Cliente reservar: solo 10–14; reservar un slot → desaparece
4. Confirmación con CTA WA si hay número
