# Self-service plans + Mercado Pago Checkout API — Design Spec

**Date:** 2026-10-05  
**Status:** draft — architecture spine companion  
**Supersedes provider of:** `2026-09-16-self-service-plans-dlocal-design.md` (comercial + pay-first + data shape **se reusan**; **pasarela = Mercado Pago**, no dLocal)  
**Spine:** `_bmad-output/planning-artifacts/architecture/architecture-tumo-app-2026-10-05-saas-mp-subscriptions/ARCHITECTURE-SPINE.md`  
**Related:**  
- `2026-09-07-billing-pause-on-vencido-design.md`  
- `2026-09-09-admin-module-activation-billing-cycle-design.md`  
- Landing live: `modules/landing/config.ts` (`PLANS` Básico/Pro/Full)  
- Billing: `shell/billing/{access,cycle,pricing}.ts`  
- Admin: `modules/admin/api/{billing,module-subscriptions}.ts`  
- Orders MP legacy **dropped** (`011_orders_drop_mercadopago.sql`) — no reabrir para SaaS  

---

## Why

Hoy:

| Capa | Estado real |
|------|-------------|
| Landing | Planes B/P/F en copy; CTA = **WhatsApp** por plan |
| Alta negocio | Manual (admin/DB) |
| Cobro SaaS | Manual `markPaid` + `business_billing` |
| Fee admin | Legacy **N × 6999** USD cents (`pricing.ts`) — **desalineado** de planes cupo |
| Mora | `hasModuleAccess` + `vencido` / `next_due_at` (PR #32) |
| MP en Pedidos | **Removido** del dominio orders |

Objetivo: **self-service mensual** — elegir plan → pagar con **Mercado Pago Checkout API** (hosted redirect) → cuenta provisionada → configurar módulos — sin WA como puerta de entrada. WA = soporte.

---

## What (acceptance) — MVP

| # | Criterion |
|---|-----------|
| A | Planes por cupo: `basico` (1), `pro` (≤3), `full` (todos registry self-serve) |
| B | Cobro v1 **solo mensual**; refs semanales solo marketing |
| C | Precios lista USD 39.99 / 89.99 / 129.99; **cargo ARS** snapshot en session |
| D | Pagar primero → provision solo con pago aprobado verificado |
| E | Post-pago: business + owner + `business_module_subscriptions` + `business_billing` al_dia + `tenant_subscriptions` |
| F | Port `PaymentProvider` + adapter **Mercado Pago** |
| G | Webhooks idempotentes; success URL no es única vía de provision; reconciler |
| H | Renovación (preapproval o cargo Tumo-initiated); fail → gracia 48h → vencido; sin wipe módulos |
| I | Onboarding mínimo post-login (slug, brand opcional) |
| J | Landing CTA → `/signup` con flag; WA secundario |
| K | Admin: sessions + re-provision + ver sub SaaS |
| L | Tests: cupo, state machine, provision idempotente, webhook replay, access mora |

## Non-goals (v1)

- Upgrade/downgrade self-serve  
- Semanal cobrable  
- AFIP / facturas PDF  
- Smart Fields embebidos  
- Multi-país  
- Custom “a medida” en checkout  
- Reemplazar OTP empleados  
- MP para pagos del cliente final (orders/turnos)  
- Remap automático fee admin legacy → planes en el mismo MVP (spec aparte OK)

---

## As-is → to-be (capas)

```
AS-IS                              TO-BE (self-serve path)
─────                              ──────────────────────
Landing PLANS + WA          →      Landing PLANS + CTA /signup
Admin create business       →      provision_tenant() post-MP
markPaid manual             →      webhook + tenant_subscriptions renew
pricing N×6999              →      plan snapshot (legacy keep for old tenants)
hasModuleAccess             →      unchanged contract (reuse)
business_module_subscriptions →   still projection of modules
```

---

## Decisions

### AD-Pricing — lista

| plan_id | interval | USD display | usd_cents lista |
|---------|----------|-------------|-----------------|
| basico | month | 39.99 | 3999 |
| pro | month | 89.99 | 8999 |
| full | month | 129.99 | 12999 |

`amount_ars_cents` = tabla fija en `shell/billing/plan-catalog.ts` (`PRICE_VERSION = 1`). Ops actualiza ARS sin cambiar lógica.

Ids **`basico|pro|full`** (como landing), no `basic`.

### AD-Provider — Mercado Pago Checkout API

**Credenciales platform (env):**

```
MP_ACCESS_TOKEN=          # server
MP_WEBHOOK_SECRET=        # verify if used / secret for notifications
MP_PUBLIC_KEY=            # only if client brick later; v1 optional
SELF_SERVICE_SIGNUP=true|false
APP_BASE_URL=https://…
GRACE_HOURS=48
```

**No** usar columnas `orders_settings.mp_*`.

**Flujo API (v1 conceptual):**

1. `POST` Preference **o** Preapproval/Suscripción (según gate cuenta) con:
   - `external_reference` = `checkout_sessions.id`
   - `notification_url` = `{APP_BASE_URL}/api/billing/webhooks/mercadopago`
   - `back_urls.success|failure|pending` = `/signup/continue?session=…`
   - item/title = plan name; `unit_price` ARS major; `quantity` 1
   - payer email (+ doc si el producto lo exige)
2. Redirect usuario a `init_point` / `sandbox_init_point`
3. Webhook: fetch payment/preapproval por id si hace falta, mapear status → `ProviderEvent`
4. Solo `approved` / authorized equivalent → `payment_succeeded`

**Gate antes de codear adapter a prod:**

| Check | Acción |
|-------|--------|
| ¿Suscripciones/Preapproval AR en la cuenta? | Preferir recurring nativo |
| Si no | Preference one-shot + estrategia renew documentada (no silent) |
| Sandbox e2e first charge + renew | Blocker de ship |

### AD-Port

```ts
type CreateCheckoutInput = {
  externalReference: string // checkout_sessions.id
  planId: "basico" | "pro" | "full"
  amountArsCents: number
  title: string
  payerEmail: string
  payerName?: string
  payerDocument?: string
  successUrl: string
  failureUrl: string
  pendingUrl: string
  notificationUrl: string
}

interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<{
    providerCheckoutId: string
    redirectUrl: string
  }>
  parseAndVerifyWebhook(
    rawBody: string,
    headers: Headers
  ): Promise<ProviderEvent>
  getPaymentStatus?(providerPaymentId: string): Promise<{
    status: "pending" | "approved" | "rejected" | "other"
    raw: unknown
  }>
}
```

### AD-Checkout state machine

Igual spine AD-7:

`started → awaiting_payment → paid → provisioned`  
(+ `failed|expired|cancelled` desde awaiting)

### AD-Provision

Orden locked (spine AD-8). Reusar helpers admin de activate module / fee sync **extraídos a shell** si hace falta (no importar `modules/admin` desde signup).

### AD-Auth owner

`owner_accounts` email+password; link employee owner; cookie `session_token`. OTP slug intacto.

### AD-Grace / mora

Reuse `isBillingOverdue` / `hasModuleAccess`. Al fallar renew: `next_due_at = now + GRACE_HOURS`, `status=pendiente`. Tras gracia: `vencido`, sub `paused`.

### AD-Legacy coexistence

| Tenant | Precio | Cobro |
|--------|--------|-------|
| Con `tenant_subscriptions` | snapshot plan | MP |
| Sin (Carri, Defe, lab…) | N×6999 o override | Admin markPaid |

No grandfather automático de precios à la carte.

---

## Data model (migración sugerida `017_saas_mp_subscriptions.sql`)

### `checkout_sessions`

| Column | Notes |
|--------|-------|
| id | UUID PK = external_reference MP |
| status | state machine |
| email | citext |
| password_hash | |
| business_name | |
| payer_name | |
| payer_document | nullable si MP hosted no lo exige siempre; collect si Platform-like rules |
| plan_id | basico\|pro\|full |
| interval | `month` v1 |
| module_ids | text[] |
| price_version | int |
| amount_cents | ARS minor snapshot |
| currency | `ARS` |
| provider | `mercadopago` |
| provider_checkout_id | preference id / preapproval id |
| provider_payment_id | last payment id |
| provider_subscription_id | preapproval id if any |
| business_id | set at provision |
| provision_error | text |
| expires_at | |
| created_at / updated_at | |

### `tenant_subscriptions`

| Column | Notes |
|--------|-------|
| id | UUID |
| business_id | |
| checkout_session_id | |
| plan_id / interval / module_ids | snapshot |
| amount_cents / currency / price_version | |
| status | active\|past_due\|paused\|cancelled |
| provider | mercadopago |
| provider_subscription_id | |
| grace_deadline_at | |
| current_period_end | |
| created_at / updated_at | |

### `provider_events`

| Column | Notes |
|--------|-------|
| id | UUID |
| provider | mercadopago |
| provider_event_id | UNIQUE (payment_id+status o topic+id) |
| type | |
| external_reference | |
| payload | jsonb |
| processed_at | |
| created_at | |

### `owner_accounts`

| Column | Notes |
|--------|-------|
| id | UUID |
| email | UNIQUE |
| password_hash | |
| created_at | |

`employees.owner_account_id` nullable (legacy phone-only).

### Existing

- `businesses`, `employees`, `sessions`  
- `business_module_subscriptions`  
- `business_billing` / `business_billing_payments` (payments rows on renew; `source=mercadopago|admin`)

---

## API surface (seed)

| Method | Path | Rol |
|--------|------|-----|
| POST | `/api/signup/checkout` | create session + MP checkout → `{ redirectUrl, sessionId }` |
| GET | `/api/signup/session?id=` | status for continue page |
| POST | `/api/signup/login` | email+password → set session cookie |
| POST | `/api/billing/webhooks/mercadopago` | IPN |
| POST | `/api/billing/reconcile` | cron secret |
| POST | `/api/admin/checkout-sessions/[id]/reprovision` | staff |
| GET | `/api/admin/checkout-sessions` | staff list |

UI routes: `/signup`, `/signup/continue`, `/login` (owner), landing `/`.

---

## Folder map (implementación)

```
shell/billing/plan-catalog.ts
shell/billing/provider/types.ts
shell/billing/provider/mercadopago/*
shell/billing/checkout/{session,apply-event,provision}.ts
modules/signup/{api,lib,public}/
modules/landing/…          # CTA + import catalog
modules/admin/…            # ops UI
app/signup/**
app/api/signup/**
app/api/billing/webhooks/mercadopago/route.ts
tests/billing-plan-catalog.test.ts
tests/billing-checkout-session.test.ts
tests/billing-mp-webhook.test.ts
tests/billing-provision.test.ts
tests/ui/signup-*.test.tsx
```

---

## Security

- Verify webhook (secret / x-signature según docs MP vigentes al implementar; tests con fixtures)  
- Rate limit create checkout (IP + email)  
- No access token al client  
- PII: document no en logs  
- Re-provision solo admin_session  
- Flag off → endpoints signup 404/403  

---

## Testing (TDD)

| Layer | Cases |
|-------|-------|
| Unit | cupo; catalog; grace/next_due; state transitions |
| Unit | applyProviderEvent idempotent + replay |
| Integration | provision once: business, owner, modules, billing, tenant_sub |
| API | webhook bad signature 401; good approved → provisioned |
| UI | plan select limits modules; continue pending/ready/error |

---

## Rollout

1. Confirmar producto MP en cuenta (Preapproval vs Preference)  
2. Cargar montos ARS en catalog  
3. Migración 017 + dual supabase  
4. Adapter sandbox  
5. Flag `SELF_SERVICE_SIGNUP` interno  
6. Landing CTA  
7. Soft launch → apagar WA primario de compra  

---

## Implement slices (orden sugerido)

1. **Catalog + cupo** (`plan-catalog.ts` + tests) — alinear landing imports  
2. **Schema 017** + types  
3. **Checkout session state machine** (sin MP: fake provider)  
4. **Provision** idempotent (fake paid)  
5. **MP adapter** createCheckout + webhook verify (sandbox)  
6. **Signup UI** + continue poll  
7. **Owner login** email/password  
8. **Admin re-provision + list**  
9. **Renew + grace + reconciler**  
10. **Landing CTA flag**  
11. **E2E sandbox gate** → prod tokens  

Cada slice: RED → GREEN → commit en branch `feat/saas-mp-subscriptions`.

---

## Open points

| Topic | Default |
|-------|---------|
| Grace | 48h |
| Interval cobrable | month only |
| ARS amounts | fixed list TBD ops |
| Owner auth | email+password |
| MP product | account gate |
| Full + new modules | no auto mid-cycle |
| Legacy fee N×6999 | keep until billing remap spec |

---

## Success metrics

- CTA → checkout started  
- started → paid  
- paid → provisioned p95 < 2 min  
- “pagué y no puedo entrar” → ~0  
- renew fail recovered in grace  

---

## Doc map

| Doc | Rol |
|-----|-----|
| Este archivo | Design spec MP self-serve |
| ARCHITECTURE-SPINE (carpeta architecture-…-saas-mp-subscriptions) | Invariantes build |
| 2026-09-16 dLocal design | Histórico comercial; **no** implementar dLocal |
| AUDITORIA-TUMO-ARQUITECTURA | Paradigma monorepo |
| landing config | Marketing mirror |
