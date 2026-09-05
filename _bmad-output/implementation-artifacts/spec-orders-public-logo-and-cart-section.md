---
title: 'Orders: logo público + sección Carrito'
type: 'feature'
created: '2026-09-05'
status: 'done'
baseline_commit: '05930dd'
review_loop_iteration: 0
context:
  - '{project-root}/docs/handoffs/PROMPT-feat-orders-logo-y-seccion-carrito.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El catálogo público de Pedidos no muestra el logo del negocio y el panel del módulo no permite subirlo; al armar el pedido no hay sección/nav Carrito siempre visible (solo barra “Ver mi pedido” con ítems).

**Approach:** Reusar `businesses.logo` + `POST /api/business/logo` (mostrar en catálogo + upload en panel Pedidos owner-only). Agregar bottom nav fija Menú|Carrito con badge de count en pantallas públicas; quitar barra “Ver mi pedido” para no duplicar CTA.

## Boundaries & Constraints

**Always:**
- Reusar shell logo (DB + API + bucket); no segundo campo/migration.
- Carrito client `tumo_cart_<slug>`; badge via `cartSummary(loadCart)`.
- Bottom nav Menú + Carrito en catalog, cart, product-detail (≥48–56px).
- Employee: logo card deshabilitada o mensaje “Solo el dueño puede cambiar el logo.”
- TDD source-contract tests; castellano llano; elderly targets.

**Ask First:**
- Storage 503 local sin env Supabase (documentar, no fingir).

**Never:**
- orders_logo / carrito server / Turnos / Loyalty / MP / hardcode PNG Carri / git add -A / push-PR sin OK humano.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Logo en catálogo | `business.logo` URL | img + alt nombre en header | N/A |
| Sin logo | `logo` null | placeholder circular con inicial | no crash |
| Upload owner | file JPEG/PNG/WebP ≤2MB | POST FormData `file` → preview + refresh | error castellano |
| Upload employee | session role employee | UI bloqueada; API 403 | mensaje dueño |
| Nav pública | en catalog/cart/detail | links Menú y Carrito | N/A |
| Badge | count > 0 | badge numérico en Carrito | sin badge si 0 |
| Empty cart | cart [] | copy + CTA menú | N/A |
| Agregar | addItem + saveCart | badge actualiza | N/A |

</frozen-after-approval>

## Code Map

- `modules/orders/public/catalog.tsx` -- header logo; quitar barra Ver mi pedido; montar nav
- `modules/orders/public/cart.tsx` -- nav + empty CTA
- `modules/orders/public/product-detail.tsx` -- nav
- `modules/orders/public/orders-public-nav.tsx` -- NEW bottom nav + badge
- `modules/orders/dashboard/panel.tsx` -- card Logo del menú + upload
- `shell/ui/settings-form.tsx` -- patrón upload referencia
- `app/api/business/logo/route.ts` + `shell/business/logo.ts` -- no tocar salvo reuso
- `tests/ui/orders-catalog.test.tsx` / `orders-cart.test.tsx` / `orders-panel.test.tsx` -- contracts
- `tests/ui/orders-public-nav.test.tsx` -- NEW si hace falta

## Tasks & Acceptance

**Execution:**
- [x] Tests RED logo catálogo + panel upload + nav Menú|Carrito + badge + empty cart
- [x] `catalog.tsx` -- logo header + nav; quitar Ver mi pedido
- [x] `panel.tsx` -- Logo del menú owner-only POST /api/business/logo
- [x] `orders-public-nav.tsx` -- tabs Menú|Carrito + badge client
- [x] `cart.tsx` + `product-detail.tsx` -- montar nav; padding safe-area
- [x] Actualizar tests que exigían Ver mi pedido; eslint + bun test

**Acceptance Criteria:**
- Given business con logo, when abro `/{slug}/orders`, then veo img del logo + nombre
- Given owner en panel Pedidos, when sube logo válido, then persiste en businesses.logo y se ve en catálogo
- Given employee, when ve card logo, then no puede subir
- Given pantallas públicas orders, when navego, then veo tabs Menú y Carrito siempre
- Given agrego producto, when miro tab Carrito, then count sube e ítems en localStorage
- Given carrito vacío, when entro a /cart, then CTA vuelve al menú

## Spec Change Log

## Design Notes

- Badge: ocultar si count 0; suscribir count post-mount o state local al agregar (evitar hydration mismatch).
- Nav fija bottom; CTAs de wizard/Agregar con `pb` extra para no quedar tapados.
- Role en panel: `GET /api/auth/me` o prop desde page si ya expone role.

## Verification

**Commands:**
- `bun test tests/orders-cart.test.ts tests/ui/orders-cart.test.tsx tests/ui/orders-catalog.test.tsx tests/business-logo.test.ts tests/ui/orders-panel.test.tsx` -- all pass
- `bunx eslint modules/orders/public/*.tsx modules/orders/dashboard/panel.tsx` -- clean

**Manual checks:**
- `/carri/orders` logo; panel upload; tabs + badge; cart persist hard refresh

## Suggested Review Order

**Logo público + upload panel**

- Header catálogo: img redonda o inicial si `business.logo` es null
  [`catalog.tsx:123`](../../modules/orders/public/catalog.tsx#L123)

- Card “Logo del menú” + FormData a `/api/business/logo`, owner-only
  [`panel.tsx:180`](../../modules/orders/dashboard/panel.tsx#L180)

- Role llega desde la page del dashboard (session)
  [`page.tsx:35`](../../app/(dashboard)/[slug]/dashboard/orders/page.tsx#L35)

**Nav Menú | Carrito**

- Bottom nav + badge (`useSyncExternalStore` + `notifyOrdersCartChanged`)
  [`orders-public-nav.tsx:1`](../../modules/orders/public/orders-public-nav.tsx#L1)

- Catálogo monta nav y quita “Ver mi pedido”
  [`catalog.tsx:285`](../../modules/orders/public/catalog.tsx#L285)

- Cart: empty CTA, sin Continuar si vacío; CTAs sobre la nav
  [`cart.tsx:233`](../../modules/orders/public/cart.tsx#L233)

- Detalle producto monta nav; Agregar notifica badge
  [`product-detail.tsx:123`](../../modules/orders/public/product-detail.tsx#L123)

**Tests**

- Contracts logo/nav/panel/cart
  [`orders-catalog.test.tsx`](../../tests/ui/orders-catalog.test.tsx)
  [`orders-public-nav.test.tsx`](../../tests/ui/orders-public-nav.test.tsx)
