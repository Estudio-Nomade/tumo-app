---
title: 'Fix signup form draft persist across checkout'
type: 'bugfix'
created: '2026-10-08'
status: 'ready-for-dev'
route: 'one-shot'
branch: 'fix/signup-form-draft-persist'
base: 'feat/saas-mp-subscriptions'
depends_on: 'PR #42 fix/signup-checkout-network-error'
handoff: 'docs/handoffs/PROMPT-fix-signup-form-draft-persist.md'
---

# Fix signup form draft persist

## Intent

**Problem:** Al apretar Continuar al pago y volver a `/signup` (atrás, refresh, failure link), hay que rellenar negocio/nombre/email/módulos.

**Root cause:** `SignupForm` solo usa `useState`; success hace `location.assign(redirectUrl)`; no hay draft en storage. No es fallo de red ni de API.

**Approach:** helper `sessionStorage` draft (sin password long-lived) + restore en form + clear al provisioned. TDD.

## Suggested Review Order

1. `tests/signup-draft.test.ts` (o equivalente)
2. `modules/signup/public/signup-draft.ts`
3. `modules/signup/public/signup-form.tsx`
4. `modules/signup/public/continue-client.tsx` (clear)
