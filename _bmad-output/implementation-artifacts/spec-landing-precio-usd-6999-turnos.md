---
title: 'Landing: precio USD 69.99/mes por módulo + Turnos en TOOLS'
type: 'feature'
created: '2026-09-09'
status: 'done'
route: 'one-shot'
---

# Landing: precio USD 69.99/mes por módulo + Turnos en TOOLS

## Intent

**Problem:** La landing seguía vendiendo $30.000 ARS/mes por módulo y no listaba Turnos (ya productizado) en “Qué hacemos”.

**Approach:** Fuente única `PRICE_PER_MODULE_USD` en config; UI/FAQ/SEO/WA alineados a USD 69.99; card Turnos “Disponible” entre Fidelización y A medida; Pedidos sigue nota EN CAMINO.

## Suggested Review Order

**Fuente de verdad (precio + TOOLS)**

- Constante USD, FAQ y card Turnos en un solo lugar.
  [`config.ts:15`](../../modules/landing/config.ts#L15)

**UI + SEO**

- Bloque precios y prefill WA con moneda correcta.
  [`pricing.tsx:22`](../../modules/landing/sections/pricing.tsx#L22)
- Link hero al mismo copy.
  [`hero.tsx:75`](../../modules/landing/sections/hero.tsx#L75)
- Metadata description/OG/Twitter.
  [`page.tsx:5`](../../app/page.tsx#L5)

**Tests de contrato**

- Constante, FAQ, metadata, orden TOOLS.
  [`landing-pricing.test.ts:1`](../../tests/landing-pricing.test.ts#L1)
- Smoke HTML: 69.99 USD, Turnos, WA encoded.
  [`landing.test.tsx:24`](../../tests/ui/landing.test.tsx#L24)
