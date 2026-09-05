---
title: 'fix(orders): panel Editar/Nuevo producto mobile-first'
type: 'bugfix'
created: '2026-09-05'
status: 'done'
route: 'one-shot'
---

## Intent

**Problem:** En `/{slug}/dashboard/orders/productos`, el form Nuevo/Editar vivía en un Dialog centrado con default `sm:max-w-sm` y scroll único; con fotos + variantes se ve cortado e inutilizable en mobile.

**Approach:** Reemplazar solo el shell del form por Sheet `side="bottom"` casi full-height, body scrolleable y footer fijo con Guardar; el Dialog de eliminar se mantiene.

## Suggested Review Order

**Shell del editor**

- Entry: formOpen ahora abre Sheet bottom full-dvh (override con misma especificidad que el default h-auto).
  [`products-manager.tsx:546`](../../modules/orders/dashboard/products-manager.tsx#L546)

- Header fijo + safe-area top; close del Sheet con pr-14.
  [`products-manager.tsx:552`](../../modules/orders/dashboard/products-manager.tsx#L552)

- Body scrolleable (flex-1 min-h-0 overflow-y-auto overscroll-contain).
  [`products-manager.tsx:564`](../../modules/orders/dashboard/products-manager.tsx#L564)

- Footer sticky: formError + Guardar 56px + Cancelar + safe-area bottom.
  [`products-manager.tsx:721`](../../modules/orders/dashboard/products-manager.tsx#L721)

**Delete intacto**

- Confirmación corta sigue en Dialog.
  [`products-manager.tsx:745`](../../modules/orders/dashboard/products-manager.tsx#L745)

**Contratos TDD**

- Source contracts Sheet + data-side height + footer/error.
  [`products-manager.test.tsx:46`](../../tests/ui/products-manager.test.tsx#L46)
