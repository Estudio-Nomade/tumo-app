---
title: 'feat(orders): multi-foto por producto con storage y carrusel'
type: 'feature'
created: '2026-09-05'
status: 'done'
baseline_commit: '890bb4f'
review_loop_iteration: 0
context:
  - '{project-root}/docs/handoffs/PROMPT-feat-orders-product-photo-carousel.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Cada producto solo tiene un `products.photo` (URL pegada). El admin no puede subir varias fotos; el cliente no ve carrusel en el detalle.

**Approach:** Tabla `product_photos` + upload real a bucket `product-photos` (máx 8). Cover denormalizado en `products.photo`. Admin sube/borra archivos; detalle público carrusel según cantidad; catálogo solo cover.

## Boundaries & Constraints

**Always:**
- `product_photos` ordenable; backfill desde `products.photo`
- Cover = foto con `sort_order` mínima (o NULL si no hay)
- Upload multipart (JPEG/PNG/WebP, 2 MB); path `{businessId}/{productId}/{uuid}.{ext}`
- Sesión tenant owner **o** employee del business del producto
- `MAX_PRODUCT_PHOTOS = 8`; mensajes en castellano llano
- TDD: tests fallan primero; API domain testeable con deps mock
- Mantener legacy `photo` en list/catalog = cover

**Ask First:**
- Agregar dependencia npm de carrusel (preferir scroll-snap CSS)
- Cambiar path/nombre de bucket distinto a `product-photos`

**Never:**
- Solo pegar N URLs sin upload de archivo
- Carrusel autoplay / carrusel en lista de catálogo
- Guardar bytes en Postgres BYTEA
- Tocar order_items snapshots, Turnos, Loyalty, landing, Photon, MP, logo business
- `git add -A`, secrets, push/PR sin OK humano

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add OK | file válido, <8 fotos | insert + cover sync + `{id,url,sortOrder}` | N/A |
| Max 8 | ya 8 fotos | no insert | 400 “Podés subir hasta 8 fotos.” |
| Mime inválido | HEIC/PDF/etc | no upload | 400 tipo no permitido |
| Oversize | >2 MB | no upload | 400 peso |
| Delete cover | borrar sort 0 | reindex/cover = nueva primera o null | N/A |
| Wrong business | product otro tenant | no mutar | 404/403 |
| Storage off | sin Supabase config | no crash | 503 claro |
| Detail 0/1/N | 0, 1, 2+ photos | Sin foto / img estática / carrusel | N/A |
| Legacy photo | solo products.photo | backfill 1 fila; UI la muestra | N/A |

</frozen-after-approval>

## Code Map

- `shell/db/migrations/004_orders.sql` -- `products.photo TEXT` actual
- `shell/db/migrations/011_orders_drop_mercadopago.sql` -- última mig; next **012**
- `shell/db/migrate.ts` -- registrar migración
- `supabase/migrations/` -- espejo timestamp > `20260905120000`
- `shell/storage/supabase.ts` -- ensure bucket + upload/remove (logo pattern)
- `shell/business/logo.ts` -- patrón domain upload (NO mezclar bucket)
- `modules/orders/api/products.ts` -- list/create/update con `photo`
- `modules/orders/api/catalog.ts` -- `CatalogProduct.photo`
- `app/api/orders/products/[id]/route.ts` -- session + CRUD
- `modules/orders/dashboard/products-manager.tsx` -- input URL único hoy
- `modules/orders/public/product-detail.tsx` -- un solo `<img>`
- `modules/orders/public/catalog.tsx` -- cover en cards
- `tests/orders-migration.test.ts` -- contract SQL
- `tests/orders-products.test.ts` -- mock SQL tagged
- `tests/business-logo.test.ts` -- patrón unit storage mock
- `tests/ui/products-manager.test.tsx` -- source contracts

## Tasks & Acceptance

**Execution:**
- [x] `tests/orders-migration.test.ts` + `shell/db/migrations/012_product_photos.sql` (+ supabase mirror + migrate.ts) -- tabla, index, backfill, cover stays
- [x] `tests/orders-product-photos.test.ts` + `modules/orders/api/product-photos.ts` + storage en `shell/storage/supabase.ts` -- add/remove/list/syncCover; max/mime/size/tenant
- [x] `app/api/orders/products/[id]/photos/route.ts` + `.../photos/[photoId]/route.ts` -- POST multipart, DELETE; session validateSession
- [x] `modules/orders/api/products.ts` + `catalog.ts` + tests -- payload `photos: {id,url,sortOrder}[]` ordenado + `photo` cover
- [x] `tests/ui/products-manager.test.tsx` + `products-manager.tsx` -- sección Fotos post-id; file multiple; grid; eliminar; principal; errores ES
- [x] `modules/orders/public/product-photo-carousel.tsx` + `product-detail.tsx` + UI test contract -- 0/1/N (scroll-snap + flechas ≥48px + “1 / N”; sin autoplay)
- [x] `catalog.tsx` -- solo cover (sin cambio obligatorio; ya usa photo)
- [x] Verify commands del handoff; eslint paths tocados

**Acceptance Criteria:**
- Given producto existente, when admin sube 3 JPEG válidos, then `product_photos` tiene 3 filas y `products.photo` = primera
- Given 8 fotos, when intenta 9ª, then 400 con mensaje de tope
- Given detalle con 2+ fotos, when abre producto público, then carrusel navegable; con 1 sin chrome extra; con 0 “Sin foto”
- Given catálogo, when lista productos, then cada card muestra cover (o Sin foto)
- Given producto legacy solo con `photo` texto, when migrate+backfill, then se ve igual vía cover/photos[0]
- Given storage no configurado, when upload, then 503 sin crash

## Design Notes

**API A (preferida):**
- `POST /api/orders/products/[id]/photos` field `file`
- `DELETE /api/orders/products/[id]/photos/[photoId]`
- Reorder v1: opcional; subir al final basta; flechas UI pueden PATCH reorder si barato

**Cover sync:** tras add/delete/reorder → `UPDATE products SET photo = (SELECT url FROM product_photos WHERE product_id=? ORDER BY sort_order LIMIT 1)` o NULL.

**Admin UX:** crear producto sin fotos → guardar → zona Fotos habilitada con `product.id`. Elderly: botones grandes, una columna mobile.

**Domain pure:**
```ts
addProductPhoto({ productId, businessId, file, ...deps })
// validate mime/size → count < 8 → storage.upload → INSERT → syncCover
```

## Verification

**Commands:**
- `bun test tests/orders-product-photos.test.ts tests/orders-products.test.ts tests/orders-catalog.test.ts tests/orders-migration.test.ts tests/ui/products-manager.test.tsx` -- all pass
- `bunx eslint` paths del handoff -- exit 0

**Manual:**
- `/carri/dashboard/orders/productos` subir 3, borrar 2, tope 9ª
- `/carri/orders` cover; `/carri/orders/producto/[id]` carrusel 0/1/N

## Suggested Review Order

**Schema**

- Tabla + backfill cover legacy
  [`012_product_photos.sql:1`](../../shell/db/migrations/012_product_photos.sql#L1)

**Domain API**

- Upload, max 8, mime/size, cover sync, orphan cleanup
  [`product-photos.ts:115`](../../modules/orders/api/product-photos.ts#L115)

- DELETE best-effort storage + cover
  [`product-photos.ts:230`](../../modules/orders/api/product-photos.ts#L230)

**Routes + storage**

- POST multipart + 503 si storage off
  [`photos/route.ts:40`](../../app/api/orders/products/[id]/photos/route.ts#L40)

- DELETE no bloquea si storage off
  [`[photoId]/route.ts:24`](../../app/api/orders/products/[id]/photos/[photoId]/route.ts#L24)

- Bucket `product-photos` ensure
  [`supabase.ts:118`](../../shell/storage/supabase.ts#L118)

**List/catalog payload**

- `photos[]` + cover prefer photos[0]
  [`products.ts:78`](../../modules/orders/api/products.ts#L78)
  [`catalog.ts:148`](../../modules/orders/api/catalog.ts#L148)

**Admin UI**

- Multi upload post-create, grid, eliminar, Principal
  [`products-manager.tsx:177`](../../modules/orders/dashboard/products-manager.tsx#L177)

**Public carousel**

- 0 / 1 / N con scroll-snap y flechas
  [`product-photo-carousel.tsx:1`](../../modules/orders/public/product-photo-carousel.tsx#L1)

**Tests**

- Domain + migration + UI contracts
  [`orders-product-photos.test.ts:1`](../../tests/orders-product-photos.test.ts#L1)
