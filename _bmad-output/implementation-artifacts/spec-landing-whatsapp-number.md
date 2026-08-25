---
title: 'Landing: número real de WhatsApp'
type: 'chore'
created: '2026-08-24'
status: 'done'
route: 'one-shot'
---

## Intent

**Problem:** La landing usaba un WhatsApp placeholder (`+54 9 11 0000-0000`) en todos los CTAs `wa.me`.

**Approach:** Actualizar `WHATSAPP_NUMBER` al número real de Tumo y fijar el dígito en el test de landing.

## Suggested Review Order

1. [config.ts — WHATSAPP_NUMBER](../../modules/landing/config.ts) — constante de contacto y `whatsappHref`
2. [landing.test.tsx — assert wa.me](../../tests/ui/landing.test.tsx) — dígitos esperados en HTML
