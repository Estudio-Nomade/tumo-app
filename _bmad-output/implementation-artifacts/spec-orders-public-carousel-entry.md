---
title: 'fix(orders): entry al detalle para ver carrusel multi-foto'
type: 'bugfix'
created: '2026-09-05'
status: 'done'
route: 'one-shot'
---

## Intent

**Problem:** En el catálogo público el cliente solo ve la cover y casi no llega al detalle (sin variantes Agregar va directo al carrito; foto/título no navegaban), así que el carrusel multi-foto existente nunca se descubre.

**Approach:** Mantener cover-only en lista; hacer clickeable cover+nombre+precio hacia el detalle y badge “N fotos” si hay más de una; Agregar sigue hermano (add directo o detalle si hay variantes).

## Suggested Review Order

**Entry UX**

- Link a detalle fuera del branch de variantes; Agregar hermano
  [`catalog.tsx:255`](../../modules/orders/public/catalog.tsx#L255)

- Badge N fotos + cover fallback photos[0]
  [`catalog.tsx:246`](../../modules/orders/public/catalog.tsx#L246)

- photoCount helper
  [`catalog.tsx:34`](../../modules/orders/public/catalog.tsx#L34)

**Contracts**

- Source contracts entry/badge/no nested Agregar/no carousel en lista
  [`orders-catalog.test.tsx:55`](../../tests/ui/orders-catalog.test.tsx#L55)
