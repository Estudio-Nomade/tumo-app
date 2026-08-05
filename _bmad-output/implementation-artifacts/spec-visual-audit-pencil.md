---
title: 'Auditoría visual completa vs Pencil'
type: 'refactor'
created: '2026-08-04'
status: 'done'
route: 'one-shot'
---

# Auditoría visual completa vs Pencil

## Intent

**Problem:** Pantallas del shell/loyalty no matcheaban los mockups de Pencil (gradiente de login ilegible, fondos naranja en cliente, nav sin labels, métricas genéricas).

**Approach:** Solo CSS/Tailwind/estructura visual alineada a `design/ui-example.pen` (tokens ink/surface/primary). Sin cambios de lógica, fetch ni APIs.

## Suggested Review Order

1. [login-form.tsx](../../shell/auth/login/login-form.tsx) — gradiente saturado 88% primary, subtítulo #FFEDD5, botón ink
2. [verify-form.tsx](../../shell/auth/login/verify-form.tsx) — mismo shell de marca
3. [registration.tsx](../../modules/loyalty/public/registration.tsx) — superficie blanca Pencil
4. [card.tsx](../../modules/loyalty/public/card.tsx) — card de progreso + dígitos del código
5. [dashboard-layout.tsx](../../shell/layouts/dashboard-layout.tsx) — pill nav con labels, sidebar blanca
6. [MetricCard.tsx](../../shell/ui/MetricCard.tsx) + [widgets.tsx](../../modules/loyalty/dashboard/widgets.tsx) — tiles y timeline
7. [panel.tsx](../../modules/loyalty/dashboard/panel.tsx) — búsqueda soft + fila cliente
8. [visual-tokens.test.tsx](../../tests/ui/visual-tokens.test.tsx) — guardas de tokens
