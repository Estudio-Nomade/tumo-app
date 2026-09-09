---
title: 'Admin billing: USD $69.99 por módulo'
type: 'feature'
created: '2026-09-09'
status: 'done'
route: 'one-shot'
baseline_commit: '877050f'
---

## Intent

**Problem:** El admin cobraba/mostraba flat $19.900 ARS, desfasado de la landing ($69.99 USD/módulo) y del # de módulos activos.

**Approach:** `PRICE_PER_MODULE_CENTS = 6999` × `active_modules.length`; mark-paid y toggle persisten tarifa; UI en USD; seed + migración 014.

## Suggested Review Order

**Precio canónico**

- Helper cents USD × N módulos.
  [`pricing.ts:1`](../../shell/billing/pricing.ts#L1)

**Mark paid / status**

- Fee por módulos; monthly persistido; payment amount override opcional.
  [`billing.ts:32`](../../modules/admin/api/billing.ts#L32)

**Toggle módulos**

- UPDATE monthly_amount_cents tras active_modules.
  [`modules.ts:61`](../../modules/admin/api/modules.ts#L61)

**List/get fallback**

- Sin row billing → N×6999 (0 si sin módulos).
  [`businesses.ts:62`](../../modules/admin/api/businesses.ts#L62)

**UI**

- formatMoney USD + subtítulo N × $69.99.
  [`business-detail.tsx:49`](../../modules/admin/dashboard/business-detail.tsx#L49)

**DB**

- Default 0 + backfill; 010 intacta.
  [`014_billing_default_usd_per_module.sql:1`](../../shell/db/migrations/014_billing_default_usd_per_module.sql#L1)

**Tests**

- Contrato 6999×N y mark-paid/modules.
  [`billing-pricing.test.ts:1`](../../tests/billing-pricing.test.ts#L1)
