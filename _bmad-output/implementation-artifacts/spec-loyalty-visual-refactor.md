---
title: 'Loyalty module visual refactor (card, registro, panel)'
type: 'refactor'
created: '2026-08-04'
status: 'done'
route: 'one-shot'
---

# Loyalty module visual refactor (card, registro, panel)

## Intent

**Problem:** Las pantallas públicas de fidelización y el panel empleado funcionan, pero no matchean los mockups Pencil ni el shell brand del login.

**Approach:** Refactor solo visual en `card.tsx`, `registration.tsx` y `panel.tsx`: gradiente brand, tarjetas, inputs/botones refinados y estados vacío/loading/toast, sin tocar fetch ni lógica de negocio.

## Suggested Review Order

1. [card.tsx](../../modules/loyalty/public/card.tsx) — shell brand, progreso, código, compartir
2. [registration.tsx](../../modules/loyalty/public/registration.tsx) — form registro/login + branding
3. [panel.tsx](../../modules/loyalty/dashboard/panel.tsx) — búsqueda, resultado, CTAs, toast
