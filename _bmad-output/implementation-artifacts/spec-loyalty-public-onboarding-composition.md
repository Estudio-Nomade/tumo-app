---
title: 'Composición lean del onboarding público loyalty'
type: 'refactor'
created: '2026-08-18'
status: 'done'
route: 'one-shot'
review_loop_iteration: 0
context: []
---

## Intent

**Problem:** En los pasos pre-cliente (phone / name / birthday) competían dos héroes (marca grande + H2 de etapa), copy redundante y un ritmo de formulario largo que restaba foco a la tarea.

**Approach:** Marca compacta en barra superior; un solo H1 por paso; copy corta; labels de campo ocultos o aria; chip de teléfono en nombre; CTA anclado abajo; errores junto al CTA.

## Suggested Review Order

1. [registration.tsx — layout lean pre-cliente](../../modules/loyalty/public/registration.tsx) — jerarquía visual phone/name/birthday
2. [phone-input.tsx — label vacío + aria-label](../../shell/ui/phone-input.tsx) — a11y sin label visible
3. [registration-birthday.test.tsx — lock de composición](../../tests/ui/registration-birthday.test.tsx) — assertions de copy/layout
