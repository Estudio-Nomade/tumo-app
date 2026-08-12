---
title: 'Marketing landing page (/)'
type: 'feature'
created: '2026-08-12'
status: 'in-review'
baseline_commit: 'f13f8f7db14304a17357231143dd246091fafc94'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La raíz `/` no tiene landing de marketing; el dueño de comercio que llega por WhatsApp no ve la propuesta de Tumo.

**Approach:** Isla `modules/landing/` (autocontenida) + `app/page.tsx` delgado. 9 secciones, tema oscuro, mobile-first + expansión desktop ligera. Copy y estructura del brief de implementación (diseño Pencil v1).

## Boundaries & Constraints

**Always:**
- Frontera: cero imports desde `shell/*` o `modules/loyalty`
- Tokens/colores en wrapper de landing (no tocar `globals.css`)
- TDD: `tests/ui/landing.test.tsx` con `bun:test` + `renderToStaticMarkup`
- Solo `<a>` (no next/link ni next/image)
- Solo editar/crear: `modules/landing/**`, `app/page.tsx`, `app/layout.tsx` (solo `lang="es"`)

**Ask First:** Cambiar copy del brief; conectar backend real.

**Never:** Auth, dashboard, `/[slug]`, Supabase, nuevas deps, features inventadas.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Render landing | mount LandingPage | Título hero, 3 módulos, 5 FAQ, chip En desarrollo, link wa.me | N/A |
| Form submit | nombre+tel | Abre wa.me con mensaje prellenado | N/A (client only) |

</frozen-after-approval>

## Code Map

- `app/layout.tsx` — lang es + Geist fonts
- `app/page.tsx` — metadata + LandingPage (crear)
- `shell/layouts/public-layout.tsx` — patrón tokens (no importar)
- `tests/ui/MetricCard.test.tsx` — convención tests
- `modules/landing/**` — isla nueva

## Tasks & Acceptance

**Execution:**
- [x] `tests/ui/landing.test.tsx` — RED then GREEN
- [x] `modules/landing/config.ts` — WHATSAPP + data
- [x] `modules/landing/ui/*` — button, chip, input, accordion
- [x] `modules/landing/logo.tsx` + sections/*
- [x] `modules/landing/landing-page.tsx` — wrapper + 9 secciones
- [x] `app/page.tsx` + `app/layout.tsx` lang
- [x] `bun test` (232 pass) + build OK; lint limpio en landing (errores preexistentes en shell/*)
- [x] Verificar frontera grep vacío

**Acceptance Criteria:**
- Given `/`, when render LandingPage, then hero title + 3 modules + 5 FAQ + wa.me + En desarrollo
- Given frontera, when grep shell/loyalty in modules/landing, then vacío
- Given build, when bun run build, then success

## Spec Change Log

## Verification

- bun run test
- bun run lint
- bun run build
- grep frontera
