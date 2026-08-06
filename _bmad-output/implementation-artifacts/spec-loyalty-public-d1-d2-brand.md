---
title: 'Loyalty público D1+D2 brand-aware (Defe Pencil, Carri intacto)'
type: 'feature'
created: '2026-08-06'
status: 'done'
baseline_commit: '1e7f0aafb4b51bfe8e8cf5c1d2a099bc4001f758'
review_loop_iteration: 0
context:
  - '{project-root}/design-artifacts/ui-example.pen'
  - '{project-root}/tests/ui/visual-tokens.test.tsx'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/[slug]/loyalty` solo pinta acentos con `primary`/`secondary`. Defe (Pencil D1 registro + D2 tarjeta) usa superficie tintada, títulos brand y jerarquía de texto distinta; Carri (Pencil genérico blanco/ink) debe quedar idéntico.

**Approach:** Extender brand tokens opcionales del negocio + CSS vars en el layout público; `registration.tsx` y `card.tsx` consumen esos tokens (no hardcode de slug). Carri con defaults actuales = sin cambio visual.

## Boundaries & Constraints

**Always:**
- Multi-tenant: cero `if (slug === 'defe')` ni skins por nombre.
- Carri (`primary=#F97316`, `secondary=#FACC15`, surface default blanco, sin tagline): mismos fondos blancos, títulos ink/stone, card con barra secondary y dígitos ink.
- Defe seedeado con surface `#e7f4f8`, tagline Pencil, primary `#577e99`, secondary `#84a7c2` se ve alineado a D1/D2 (fondo tintado, títulos primary, muted secondary, card primary, dígitos primary, barra de progreso blanca).
- Lógica de registro/login/fetch/cookies sin cambios de comportamiento.
- TDD: tests fallan primero; actualizar `visual-tokens.test.tsx` y tests de UI/public brand.

**Ask First:**
- Agregar más columnas brand que `surface_color` + `tagline`.
- Cambiar layout estructural de D2 a grilla de sellos (Pencil actual D2 es barra + código, no sellos).
- Tocar pantallas dashboard/login empleado.

**Never:**
- Romper Carri o defaults del template naranja.
- Gradiente de card con stop fijo `#9a3412` (marrón Carri) para todos los brands — usar mezcla neutra con primary/black.
- Cambiar APIs de customers ni el flujo cookie → card.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Carri defaults | surface blanco/null, sin tagline | Blanco; título ink; “Programa de fidelización”; progress secondary | N/A |
| Defe brand | surface `#e7f4f8`, tagline, colors Defe | Tinted; ink=primary; muted=secondary; tagline; dígitos primary; progress clara | N/A |
| Logo / sin logo | logo URL o null | img o monograma primary | N/A |
| Cliente logueado | cookie + customer | `LoyaltyCard` con mismos tokens | N/A |

</frozen-after-approval>

## Code Map

- `shell/layouts/public-layout.tsx` — CSS vars brand (`--color-primary/secondary` + surface/ink/muted públicos)
- `modules/loyalty/public/registration.tsx` — D1: shell, header, tipografía, tagline
- `modules/loyalty/public/card.tsx` — D2: shell, header, reward card, dígitos, progress fill
- `lib/modules.ts` — tipo `Business`
- `shell/db/business.ts` + migrations — leer/escribir nuevos campos
- `shell/db/seed-defe.ts` / seed — surface + tagline Defe
- `shell/db/migrations/*` — `surface_color`, `tagline`
- `tests/ui/visual-tokens.test.tsx` — guardas Carri vs brand-aware
- `tests/ui/*` (registration/card si existen) o nuevos tests de class/token

## Tasks & Acceptance

**Execution:**
- [x] `shell/db/migrations/` — ADD `surface_color TEXT DEFAULT '#FFFFFF'`, `tagline TEXT NULL` en `businesses`
- [x] `lib/modules.ts` + `shell/db/business.ts` + deps SELECT — mapear campos nuevos
- [x] `shell/db/seed-defe.ts` — UPSERT Defe con surface `#e7f4f8`, tagline `Club Defensores de Belgrano · Desde 1950`
- [x] `shell/layouts/public-layout.tsx` — vars: `--color-surface-public`, `--color-ink-public`, `--color-muted-public` (si surface es blanco/#fff → ink `#1C1917` + muted stone; si no → ink=primary, muted=secondary)
- [x] `modules/loyalty/public/registration.tsx` — bg surface-public; nombre ink-public; tagline o fallback “Programa de fidelización” en muted-public; labels/títulos secundarios brand-aware; sin cambiar forms/API
- [x] `modules/loyalty/public/card.tsx` — mismo shell; saludo ink-public; business name muted; reward card gradient sin `#9a3412` fijo; progress fill blanco si surface tintada, si no `secondary`; dígitos ink-public; hint muted
- [x] `tests/ui/visual-tokens.test.tsx` (+ tests unit del helper de tokens si se extrae) — Carri markers (bg-white path / default ink); brand-aware markers (surface/ink vars); no hardcode slug
- [x] Run migration + seed Defe + tests relevantes

**Acceptance Criteria:**
- Given negocio Carri con defaults, when abro `/carri/loyalty` sin cookie, then fondo blanco, título oscuro ink, subtítulo “Programa de fidelización”, botón primary naranja.
- Given negocio Defe seedado, when abro `/defe/loyalty` sin cookie, then fondo `#e7f4f8` (via token), título “El Defe Cantina” en primary, tagline Club Defensores…, CTA primary.
- Given cliente autenticado en Defe, when veo la tarjeta, then shell tintado, header brand, card primary, contador “N de M”, progress clara, dígitos en primary, sin marrón naranja en el gradiente.
- Given cualquier slug, when busco en el código, then no hay branches por slug/nombre de negocio.
- Given suite UI visual, when corro tests, then pasan y fallan si se revierte a solo-acentos o se rompe Carri white shell.

## Spec Change Log

## Design Notes

- **Tinted vs classic:** surface blanco/null ⇒ classic (Carri: ink `#1C1917`, muted stone). Otro surface ⇒ tinted (ink=primary, muted=secondary). Helper puro `isNeutralSurface(hex)`.
- **Pencil D2 (Y92YhL):** barra + código 4 dígitos (no sellos).
- **Tagline:** solo UI pública; seed SQL para Defe (settings out of scope).
- **Gradiente card:** classic conserva stop `#9a3412`; tinted usa `color-mix(primary, black)` vía `--color-card-to`.

## Verification

**Commands:**
- `bun test tests/ui/visual-tokens.test.tsx` — expected: pass
- `bun test tests/ui` — expected: pass (o subset registration/card)
- migración + `bun run shell/db/seed-defe.ts` — Defe con surface/tagline

**Manual checks:**
- `/carri/loyalty` vs Pencil genérico (blanco/ink)
- `/defe/loyalty` vs Pencil D1; post-registro vs D2

## Suggested Review Order

**Token engine (entry point)**

- Classic vs tinted: surface blanco ⇒ ink/stone; otro ⇒ primary/secondary
  [`public-tokens.ts:25`](../../shell/brand/public-tokens.ts#L25)

- Hex inválido cae a blanco (Carri-safe)
  [`public-tokens.ts:9`](../../shell/brand/public-tokens.ts#L9)

**Schema + data**

- Columnas `surface_color` / `tagline`
  [`002_business_surface_tagline.sql:1`](../../shell/db/migrations/002_business_surface_tagline.sql#L1)

- SELECT/RETURNING mapean los campos nuevos
  [`business.ts:15`](../../shell/db/business.ts#L15)

- Seed Defe con surface Pencil + tagline
  [`seed-defe.ts:5`](../../shell/db/seed-defe.ts#L5)

**Public shell binding**

- Layout inyecta CSS vars brand
  [`public-layout.tsx:15`](../../shell/layouts/public-layout.tsx#L15)

- D1 registro: surface/ink/muted + tagline
  [`registration.tsx:110`](../../modules/loyalty/public/registration.tsx#L110)

- D2 tarjeta: progress-fill, card-to, dígitos ink
  [`card.tsx:101`](../../modules/loyalty/public/card.tsx#L101)

**Tests**

- Unit classic/tinted + invalid surface
  [`brand-public-tokens.test.ts:1`](../../tests/brand-public-tokens.test.ts#L1)

- Guardas visuales sin slug hardcode
  [`visual-tokens.test.tsx:32`](../../tests/ui/visual-tokens.test.tsx#L32)
