---
title: 'Landing — precio por módulo $30.000/mes'
type: 'feature'
created: '2026-08-31'
status: 'done'
route: 'one-shot'
---

# Landing — precio por módulo $30.000/mes

## Intent

**Problem:** La landing mostraba “Desde $19.900” en UI, FAQ, WhatsApp y metadata SEO; el precio real es $30.000 ARS/mes por módulo.

**Approach:** Fuente única `PRICE_PER_MODULE_ARS` en config; copy por módulo/mes en pricing, hero, FAQ y metadata; tests de contrato.

## Suggested Review Order

**Fuente de verdad**

- Constante y FAQ “¿Cuánto sale?” sin “Desde” ni 19.900
  [`config.ts:15`](../../modules/landing/config.ts#L15)

**UI visible**

- Bloque `#precios`: $30.000 + ARS / mes por módulo + WA prefill
  [`pricing.tsx:21`](../../modules/landing/sections/pricing.tsx#L21)

- Hero link secundario alineado al precio por módulo
  [`hero.tsx:70`](../../modules/landing/sections/hero.tsx#L70)

**SEO**

- description / OG / Twitter desde la misma constante
  [`page.tsx:5`](../../app/page.tsx#L5)

**Tests**

- Contrato config + metadata
  [`landing-pricing.test.ts:1`](../../tests/landing-pricing.test.ts#L1)

- Smoke HTML landing sin 19.900 / Desde
  [`landing.test.tsx:33`](../../tests/ui/landing.test.tsx#L33)
