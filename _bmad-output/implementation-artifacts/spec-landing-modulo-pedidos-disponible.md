---
title: 'Landing: Pedidos Disponible en Qué hacemos'
type: 'feature'
created: '2026-09-09'
status: 'done'
route: 'one-shot'
baseline_commit: 'aca16e2'
---

## Intent

**Problem:** El módulo Pedidos ya está productizado, pero la landing lo mostraba como teaser “EN CAMINO / lo estamos armando”.

**Approach:** Subir Pedidos a `TOOLS` como card Disponible (Fidelización → Pedidos → Turnos → A medida) y eliminar `ORDERS_NOTE` + bloque dashed.

## Suggested Review Order

**Config catálogo**

- Card Pedidos Disponible; sin highlighted; copy retiro/transferencia/panel.
  [`config.ts:62`](../../modules/landing/config.ts#L62)

- Comentario TOOLS sin “nota humilde”; sin `ORDERS_NOTE`.
  [`config.ts:53`](../../modules/landing/config.ts#L53)

**UI sección**

- Grid solo `TOOLS.map`; sin footer dashed EN CAMINO.
  [`modules.tsx:35`](../../modules/landing/sections/modules.tsx#L35)

**Tests**

- Orden ids loyalty→orders→turnos→custom + status Disponible.
  [`landing-pricing.test.ts:57`](../../tests/landing-pricing.test.ts#L57)

- HTML: Pedidos card; not EN CAMINO / lo estamos armando.
  [`landing.test.tsx:24`](../../tests/ui/landing.test.tsx#L24)
