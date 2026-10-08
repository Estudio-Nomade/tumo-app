---
title: 'Fix signup form draft persist across checkout'
type: 'bugfix'
created: '2026-10-08'
status: 'done'
baseline_commit: '3c3bc1d'
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

## Decisions

- **Password:** omitida del draft (usuario re-tipea solo la pass). Scrub si aparece en storage viejo. bfcache `pageshow` limpia password en memoria.
- **Plan rule:** draft gana si existe; `?plan=` solo cuando no hay draft (landing fresca).
- **TTL:** 2h desde último `savedAt`.
- **Key:** `tumo_signup_draft_v1`.

## Tasks & Acceptance

- [x] Helper load/save/clear + sanitize modules + scrub password
- [x] Form restore via useSyncExternalStore + save on change/submit
- [x] Clear draft on continue `provisioned`
- [x] Unit tests RED→GREEN
- [x] Browser smoke: fill → Continuar → Back → fields restored, password empty
- [x] eslint scoped green

## Suggested Review Order

**Draft helper**

- Schema v1, TTL, sanitize cupo, scrub password on load
  [`signup-draft.ts:1`](../../modules/signup/public/signup-draft.ts#L1)

**Form wiring**

- Stable snapshot + seed from draft; password never in draft
  [`signup-form.tsx:90`](../../modules/signup/public/signup-form.tsx#L90)

- Save on local change and before `location.assign`
  [`signup-form.tsx:107`](../../modules/signup/public/signup-form.tsx#L107)

**Clear on success**

- Clear draft when session is provisioned
  [`continue-client.tsx:76`](../../modules/signup/public/continue-client.tsx#L76)

**Tests**

- Helper roundtrip, corrupt, TTL, scrub, sanitize
  [`signup-draft.test.ts:1`](../../tests/signup-draft.test.ts#L1)
