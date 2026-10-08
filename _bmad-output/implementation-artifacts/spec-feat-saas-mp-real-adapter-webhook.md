---
title: 'SaaS MP real Preference adapter + webhook'
type: 'feature'
created: '2026-10-08'
status: 'in-progress'
route: 'one-shot'
branch: 'feat/saas-mp-real-adapter-webhook'
base: 'feat/saas-mp-subscriptions'
---

# SaaS MP real adapter + webhook (slice 5)

## Intent

Wire `BILLING_PROVIDER=mercadopago` to a real Preference API adapter + webhook route so signup Continuar al pago opens Mercado Pago hosted checkout (not fake demo / dead ngrok).

## Root ops issue (user)

`ERR_NGROK_3200` on Pagar demo: `APP_BASE_URL` pointed at offline tunnel; fake POST continue used that base.

## Approach

- `shell/billing/provider/mercadopago` Preference + payment fetch + x-signature
- `handle-webhook` → `applyProviderEvent`
- `POST/GET /api/billing/webhooks/mercadopago`
- factory in `modules/signup/lib/provider.ts`
- TDD tests mock fetch

## Verify

- unit tests green
- env `BILLING_PROVIDER=mercadopago` + token → redirectUrl is MP init_point
- tunnel for webhook e2e; local APP_BASE_URL=localhost for back_urls without dead ngrok
