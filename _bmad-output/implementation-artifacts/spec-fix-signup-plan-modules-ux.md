---
title: 'fix(signup): plan cards + module picker UX'
type: 'bugfix'
created: '2026-10-08'
status: 'done'
baseline_commit: 'df5857d69ec57a600f526aeb684f286dd7140730'
review_loop_iteration: 0
context:
  - '{project-root}/docs/handoffs/PROMPT-fix-signup-plan-modules-ux.md'
  - '{project-root}/modules/landing/sections/pricing.tsx'
  - '{project-root}/modules/landing/config.ts'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/signup` usa `<select>` nativo de plan y checkboxes pelados de módulos; se ve ajeno a la landing dark+violeta y el copy residual dice “cobro demo local (fake MP)”.

**Approach:** Reemplazar plan y módulos por cards/toggles al estilo `PricingSection` + `TOOLS`, manteniendo cupo client idéntico y el mismo `POST /api/signup/checkout`.

## Boundaries & Constraints

**Always:**
- Parity visual landing: `#0A0A0A`/`#000`, `rounded-[24px]`, borde `#262626`, acento `#7754E3`/`#7527E3`, CTA pill `min-h-[52px]`, hit targets ≥48px.
- Cupo client: basico = exactamente 1 (tap reemplaza); pro ≤3; full = 3 locked selected + copy “incluido en Full”.
- Contador visible: “Elegiste N de M” / “Cupo completo”.
- Payload sin cambio: `{ email, password, businessName, payerName, planId, moduleIds }`.
- Copy CTA neutro: “Continuar al pago” / subtítulo sin “fake MP”.
- TDD: test falla primero; `bun test` scoped green; eslint solo archivos tocados.
- Copy módulos desde `TOOLS` (loyalty|orders|turnos) — no importar domain de módulos.

**Ask First:**
- Cambiar precios/cupo en `PLAN_CATALOG` o landing `PLANS`.
- Tocar `continue-client.tsx` más allá de polish mínimo de familia visual.
- Cualquier cambio a flags, API checkout, provider, webhook, provision.

**Never:**
- MP adapter, webhook, provision, schema, admin billing, owner login post-pago.
- Cross-import `modules/orders|loyalty|turnos` domain.
- Material/Bootstrap/CSS modules nuevos; framer obligatorio.
- `git add -A`; commit de marketing/flyers/`.env*`.
- Reintroducir copy dLocal o “fake MP” en UI.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Plan cards render | mount con `initialPlan=pro` | 3 plan cards; Pro highlighted; pro selected | N/A |
| basico single slot | plan=basico, tap otro módulo | solo ese módulo selected | N/A |
| pro cupo | plan=pro, 3 selected, tap 4º | no agrega; contador “Cupo completo” | N/A |
| full locked | plan=full | 3 selected, no se pueden deseleccionar; badge “incluido en Full” | N/A |
| plan change | pro→basico con 2+ mods | queda 1 (primero o default loyalty) | N/A |
| plan change full | any→full | fuerza los 3 | N/A |
| submit payload | form válido | POST body incluye planId + moduleIds actuales | errores red/API igual que hoy |
| CTA copy | idle | “Continuar al pago”; subtítulo sin “fake MP” | N/A |

</frozen-after-approval>

## Code Map

- `modules/signup/public/signup-form.tsx` — form client (select+checkboxes hoy); target principal
- `modules/signup/public/continue-client.tsx` — post-pago; polish opcional familia visual
- `app/signup/page.tsx` — `searchParams.plan` → `initialPlan`
- `modules/landing/sections/pricing.tsx` — SoT visual cards plan
- `modules/landing/config.ts` — `TOOLS`, `PLANS` copy
- `modules/landing/ui/button.tsx` — `LandingButton` pill
- `shell/billing/plan-catalog.ts` — `PLAN_CATALOG`, cupo server (read-only)
- `tests/ui/signup-form.test.tsx` — **crear** (SSR markup pattern como landing)
- `tests/signup-flags.test.ts` / `tests/signup-checkout-api.test.ts` — regresión, no cambiar contrato

## Tasks & Acceptance

**Execution:**
- [x] `tests/ui/signup-form.test.tsx` — RED: plan cards (no native select-only), module cards + cupo basico/pro/full + CTA copy sin fake MP — TDD first
- [x] `modules/signup/public/signup-form.tsx` — GREEN: plan picker cards, module picker cards (`aria-pressed`), contador cupo, layout mobile-first, copy neutro; reusar TOOLS/PLAN_CATALOG
- [x] `modules/signup/public/*` (opcional extract) — `module-options.ts` + `module-selection.ts`; sin cross-module domain
- [x] `modules/signup/public/continue-client.tsx` — polish mínimo `rounded-[24px]`
- [x] Verify — `bun test` scoped + eslint tocados + browser smoke 3 planes (HTTP 200 + markup strings)

**Acceptance Criteria:**
- Given `/signup?plan=pro`, when render, then plan cards estilo landing con Pro destacado y sin `<select>` como único control de plan
- Given basico, when tap segundo módulo, then solo ese queda selected
- Given pro con 3 módulos, when tap otro, then no agrega y muestra cupo completo
- Given full, when try deselect, then los 3 permanecen selected/disabled-on con copy incluido
- Given form listo, when Continuar, then POST `/api/signup/checkout` con contrato actual
- Given UI, when leer subtítulo/CTA, then no aparece “fake MP” ni “cobro demo local”

## Spec Change Log

## Design Notes

- Plan cards: map `PLAN_CATALOG` + highlight Pro como pricing; tap setea `planId` y reaplica cupo (misma lógica actual del form).
- Module cards: `button` o card con `aria-pressed`; checkbox sr-only OK; title+description desde `TOOLS` filtrado a loyalty|orders|turnos.
- Prefer HTML+Tailwind landing; `LandingButton` para CTA si no complica client boundary.
- Tests: `renderToStaticMarkup` + `expect(html).toContain` (patrón `tests/ui/landing.test.tsx`); para toggle cupo, exportar helpers puros de selección o montar con state via props de test si hace falta — prefer helpers de cupo testables sin RTL si el repo no lo usa.

## Verification

**Commands:**
- `export PATH="$HOME/.bun/bin:$PATH" && bun test tests/ui/signup-form.test.tsx tests/signup-flags.test.ts tests/signup-checkout-api.test.ts` — expected: all green
- `bunx eslint modules/signup/public/**/*.tsx app/signup/**/*.tsx` — expected: clean on touched

**Manual checks:**
- Hard refresh `localhost:3000/signup?plan=basico|pro|full` width ~390px: cards, cupo, Full locked, Continuar al pago

## Suggested Review Order

**Cupo (lógica pura)**

- Helpers de selección: defaults, plan change, toggle sin vacío, contador
  [`module-selection.ts:4`](../../modules/signup/public/module-selection.ts#L4)

**Copy módulos**

- SoT TOOLS → loyalty|orders|turnos
  [`module-options.ts:14`](../../modules/signup/public/module-options.ts#L14)

**UI plan + módulos**

- Form shell dark + copy neutro MP
  [`signup-form.tsx:100`](../../modules/signup/public/signup-form.tsx#L100)

- Plan radiogroup cards (Pro destacado)
  [`signup-form.tsx:118`](../../modules/signup/public/signup-form.tsx#L118)

- Module cards aria-pressed + Full locked + contador
  [`signup-form.tsx:180`](../../modules/signup/public/signup-form.tsx#L180)

- CTA disabled si sin módulos; alert errores
  [`signup-form.tsx:287`](../../modules/signup/public/signup-form.tsx#L287)

**Tests**

- Cupo unit + markup SSR
  [`signup-form.test.tsx:1`](../../tests/ui/signup-form.test.tsx#L1)
