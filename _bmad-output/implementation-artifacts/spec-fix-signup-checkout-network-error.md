---
title: 'Fix signup checkout network error mask'
type: 'bugfix'
created: '2026-10-08'
status: 'done'
route: 'one-shot'
---

# Fix signup checkout network error mask

## Intent

**Problem:** Al apretar Continuar al pago, un fallo de Postgres (ECONNREFUSED) o un 500 sin body se mostraba como “Error de red. Reintentá.”

**Approach:** try/catch JSON en la route + parse seguro de `res.json` en el form; copy de red solo para fallo real de `fetch`.

## Suggested Review Order

1. [tests/signup-checkout-errors.test.ts](../../../tests/signup-checkout-errors.test.ts) — contrato error UI + mapping DB
2. [modules/signup/lib/checkout-route-error.ts](../../../modules/signup/lib/checkout-route-error.ts) — 503 `db_unavailable` vs 500
3. [app/api/signup/checkout/route.ts](../../../app/api/signup/checkout/route.ts) — catch nunca body vacío
4. [modules/signup/public/checkout-client-errors.ts](../../../modules/signup/public/checkout-client-errors.ts) + [signup-form.tsx](../../../modules/signup/public/signup-form.tsx) — parse + mensajes
