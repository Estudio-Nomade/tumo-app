---
title: 'Admin panel force-dynamic'
type: 'bugfix'
created: '2026-09-08'
status: 'done'
route: 'one-shot'
---

## Intent

**Problem:** El build de Vercel fallaba al prerenderizar `/admin` porque el Server Component consultaba Postgres en compile-time y el tenant/pooler no resolvía.

**Approach:** Marcar el segment layout del panel admin con `export const dynamic = "force-dynamic"` para que Next no SSG-ee esas rutas en el build.

## Suggested Review Order

- Segment config en el layout del panel (cubre `/admin` y children).
  [`layout.tsx:4`](../../app/admin/(panel)/layout.tsx#L4)

- Test de regresión por source contract.
  [`admin-panel-dynamic.test.ts:10`](../../tests/admin-panel-dynamic.test.ts#L10)
