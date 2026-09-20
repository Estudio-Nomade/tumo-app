# Self-service plans + dLocal checkout — Design Spec

**Date:** 2026-09-16  
**Status:** draft — pending user review  
**Docs check:** Context7 2026-09-16 — `/websites/dlocal` + `/websites/dlocalgo_integration-api`  
**Related:**  
- `2026-09-07-billing-pause-on-vencido-design.md`  
- `2026-09-09-admin-module-activation-billing-cycle-design.md`  
- `2026-08-30-admin-panel-design.md`  
- Landing: `modules/landing/*` (CTA WhatsApp)  
- Billing shell: `shell/billing/{access,cycle,pricing}.ts`

## Why

Hoy un comercio no puede empezar solo: la landing manda a WhatsApp, el alta del business es manual (DB/admin), y el cobro SaaS no está cableado a una pasarela (solo billing manual + `markPaid`). Los “payments” de orders/turnos son del **cliente final del local**, no de la suscripción Tumo.

Objetivo: **self-service end-to-end antifrágil** — elegir plan → pagar → cuenta lista → configurar — sin depender de WhatsApp para montar módulos. WhatsApp queda como soporte, no como puerta de entrada.

## What (acceptance) — MVP duro

| # | Criterion |
|---|-----------|
| A | Catálogo de **planes por cupo**: Básico (1 módulo), Pro (hasta 3), Full (todos los módulos self-service actuales y futuros del catálogo registrable) |
| B | Intervalos **semanal** y **mensual**; mensual más barato que 4× semanal (~10–17% según grilla) |
| C | Precios v1 (equivalente USD de lista; **cobro real en ARS** al cliente): ver AD-Pricing |
| D | Flujo **pagar primero**: datos mínimos (incl. **DNI/CUIT payer** exigido por dLocal AR) → checkout hosted/redirect → provision solo con `status=PAID` confirmado |
| E | Post-pago: `business` + owner empleado + `business_module_subscriptions` active + `business_billing` `al_dia` + subscription interna |
| F | Capa `PaymentProvider` + adapter concreto (ver AD-4 producto dLocal); dominio Tumo es source of truth |
| G | Webhooks/IPN idempotentes (HMAC); `callback`/`success` URL **no** es la única vía de provision; reconciler puede `GET` payment por id |
| H | Renovación recurrente (plan provider o card-on-file / enrollment según producto); fallo → gracia **corta (48h default)** → `vencido` / sub `paused` y `hasModuleAccess` = false |
| I | Wizard onboarding mínimo post-login (slug, brand opcional, deep-link módulo); **no** es paywall |
| J | Landing: planes + CTA self-service (WhatsApp deja de ser CTA primario de compra) |
| K | Admin mínimo: listar checkout sessions + subscriptions; acción **Re-provision** si `paid` ∧ ¬`provisioned` |
| L | Job/reconciler periódico: paid sin provision, past_due fuera de gracia, webhooks perdidos |
| M | Tests: pricing/cupo, state machine checkout, provision idempotente, webhook replay, access en mora |

## Non-goals (v1)

- Self-serve upgrade/downgrade de plan o swap de módulos desde el panel del dueño  
- Portal rico de facturas / PDF / AFIP  
- Cambio de tarjeta UX fancy (solo link mínimo de recovery de pago si el provider lo expone)  
- Trial gratis largo  
- Multi-país / multi-moneda de cobro  
- Módulo “a medida” / custom en el catálogo self-service (sigue por soporte)  
- Tutoriales por módulo (feature aparte)  
- Reemplazar auth OTP de **empleados** del local (sigue igual)  
- Cobro del cliente final del comercio vía dLocal (orders/turnos sin cambio de pasarela SaaS)

## Decisions (locked)

### AD-1 — Modelo comercial: planes por cupo

| Plan id | Cupo de módulos | Notas |
|---------|-----------------|-------|
| `basic` | 1 | El usuario elige exactamente 1 id de módulo registrable |
| `pro` | 3 | Hasta 3 ids distintos |
| `full` | unlimited (catálogo self-service) | Auto-selecciona **todos** los `getRegisteredModuleIds()` al momento del checkout; no se desmarcan en v1. Módulos futuros: política Full = “todo lo self-service al renovar/provision de catálogo” se aplica en **altas nuevas** y, en v1, **no** auto-activa módulos nuevos mid-cycle en tenants Full existentes (evita sorpresas); documentar follow-up si se desea auto-attach |

**Unidad de cobro = el plan**, no N × precio módulo.  
`business_module_subscriptions` sigue existiendo como proyección de acceso por módulo (compatible con admin y `hasModuleAccess`).

**Swap de módulos / cambio de plan:** fuera de v1 self-serve; admin puede seguir activate/deactivate manual (ops).

### AD-2 — Pricing v1 (lista)

Montos en **centavos de la moneda de lista interna `USD` para comunicación**; **cargo al cliente en `ARS`**.

| Plan | Interval | Amount (USD display) | cents internos USD* |
|------|----------|----------------------|---------------------|
| basic | month | 39.99 | 3999 |
| basic | week | 11.99 | 1199 |
| pro | month | 89.99 | 8999 |
| pro | week | 25.99 | 2599 |
| full | month | 129.99 | 12999 |
| full | week | 36.99 | 3699 |

\*Tabla de catálogo versionada (`price_version = 1`).  
**ARS al checkout:** `amount_ars_cents = f(amount_usd_cents, fx_rate_or_fixed_list)` — implementación v1 preferida: **lista fija ARS por plan+interval** en config (operación actualiza números sin redeploy de lógica), no scraping de FX en el request. El checkout **siempre** muestra el monto ARS exacto a debitar.

Reemplaza la narrativa landing `PRICE_PER_MODULE_USD = 69.99` y el fee admin `N × 6999` como **verdad de precio self-service**.  
Admin legacy: businesses sin `subscriptions` provider siguen con fee manual N× o override; self-service nuevos usan `plan.amount` (ver AD-Billing).

### AD-3 — Mercado y moneda

- Mercado v1: **Argentina**  
- Cobro: **ARS**  
- Copy puede mencionar equiv. USD; el débito y el resumen de pago son ARS

### AD-4 — Pasarela: dLocal + abstracción

Hay **dos productos** en el ecosistema dLocal (docs distintas). El adapter se nombra por el que esté habilitado en la cuenta del merchant.

| Producto | Docs | Checkout | Recurring | Auth API |
|----------|------|----------|-----------|----------|
| **dLocal Go** | dlocalgo integration-api | `POST /v1/payments` (+ `success_url`) o **Subscriptions**: `POST /plans` → `subscribe_url` | Nativo: plans con `frequency_type` `WEEKLY` \| `MONTHLY`, suscripciones `CREATED`/`CONFIRMED`, `allow_recurring` en payments | `Authorization: Bearer API_KEY:SECRET_KEY` |
| **dLocal Platform (Payins)** | docs.dlocal.com | `POST /payments` con `payment_method_flow: REDIRECT` → `redirect_url` cuando `PENDING` | No es “Stripe Billing” global: **card save** (`/secure_cards` → `card_id`), **network tokens / MIT**, o **enrollments** (`POST /enrollments` + cargos con `enrollment.id`) — disponibilidad **por país/método**; validar AR en la cuenta | Headers `X-Login`, `X-Trans-Key`, `X-Date`, `Authorization: V2-HMAC-SHA256, Signature: …` |

**Decisión de producto (gate antes de codear adapter):**

1. Confirmar en el dashboard de la cuenta creada: **¿Go, Platform, o ambos?**  
2. **Preferencia MVP si la cuenta es dLocal Go:** Subscriptions API (`/plans` + `subscribe_url`) — mapea 1:1 a basic/pro/full × week/month, hosted checkout, webhooks de sub.  
3. **Si solo Platform:** v1 = `REDIRECT` payin ARS + guardar credencial/card o enrollment para renew; Tumo **dispara** el cobro del ciclo (cron) y aplica gracia — no asumir debit automático del provider.  
4. La interface `PaymentProvider` **oculta** esta diferencia; un solo adapter concreto se implementa tras el gate.

```
PaymentProvider {
  createCheckout(input) → { providerCheckoutId, redirectUrl }
  parseAndVerifyWebhook(raw, headers) → ProviderEvent | error
  getPaymentStatus?(providerPaymentId) → status   // reconciler; Platform GET /payments/{id}
  chargeRenewal?(subscription) → …               // si merchant-initiated
  // v1.1+: cancelSubscription, updatePaymentMethod URL...
}

ProviderEvent (normalized):
  type: payment_succeeded | payment_failed | renewal_succeeded | renewal_failed
        | subscription_cancelled | chargeback | payment_pending
  providerEventId: string          // idempotency: payment id + status, o event id si existe
  externalReference: string        // = order_id / external_id = checkout_sessions.id
  providerSubscriptionId?: string  // Go subscription id o enrollment id
  providerPaymentId?: string       // dLocal payment id (D-… / DP-…)
  amountCents?: number
  currency?: string
  statusCode?: string              // "200" PAID, "100" PENDING, "300" REJECTED (Platform)
  paidAt?: Date
  raw: unknown
}
```

**Contratos alineados a docs (locked para implementación):**

| Concepto Tumo | dLocal Go | dLocal Platform |
|---------------|-----------|-----------------|
| External id | `order_id` en payment / metadata sub | `order_id` (merchant capture id) |
| Moneda / país | `currency`, `country: "AR"` | `currency: "ARS"`, `country: "AR"` |
| Redirect usuario | `success_url` / `error_url` / `back_url` (plans) | `callback_url` + response `redirect_url` si PENDING |
| IPN | `notification_url` | `notification_url` |
| Firma IPN | HMAC-SHA256; header `Authorization: V2-HMAC-SHA256, Signature: …` (message = apiKey + raw body en Go docs) | HMAC-SHA256 sobre `X-Login` + `X-Date` + body; comparar header Authorization |
| Payer | email (+ lo que pida checkout hosted) | **`payer.name`, `payer.email`, `payer.document` mandatory** en payins AR |
| Estados pago | según notificaciones Go | `PENDING` (100) → final `PAID` (200) o `REJECTED` (300) async |

**Hosted/redirect v1 (no Smart Fields embebidos).** Smart Fields = v2 UX.  
Credenciales solo server-side.  
**Gate de ship:** sandbox end-to-end (primer pago + al menos un renew o enrollment charge) en la cuenta real antes de prod. Si recurring no está habilitado para AR en esa cuenta → **no ship MVP completo**; change request explícito a one-shot + ops (no silencioso).

### AD-4b — Datos payer / KYC mínimo en signup

dLocal Platform payins AR documentan **`payer.document` obligatorio** (DNI/CUIT según método). Aunque Go checkout hosted a veces lo pide en su UI, Tumo **collecta en signup** para:

1. Enviar un payload completo si el adapter es Platform  
2. Fraud/ops  
3. Evitar rechazo por datos incompletos  

**Campos pre-pago actualizados:**

1. Plan + interval  
2. Módulo(s) según cupo (server-side)  
3. Email (login)  
4. Password  
5. Nombre del comercio  
6. **Nombre y apellido del pagador** (`payer.name`)  
7. **Documento AR** (`payer.document` — DNI 7–8 dígitos o CUIT; validación formato liviana v1)  

**No** pedir pre-pago: horarios, catálogo, logo obligatorio, slug final, domicilio completo (address opcional salvo que un método AR concreto lo exija en producción — entonces se agrega).

### AD-5 — Pagar primero + alta

Usa el set de campos de AD-4b.

**Provision (solo `payment_succeeded` aplicado):**

1. Crear `businesses` row (nombre; slug temporal único si hace falta, p.ej. derivado + sufijo)  
2. Crear `employees` owner (`role` owner/admin según convención existente) ligado al business  
3. Persistir credencial owner (ver AD-Auth)  
4. Activar módulos elegidos vía misma semántica que `activateModule` (filas `business_module_subscriptions` + sync `active_modules`)  
5. Crear `tenant_subscriptions` (nombre tentativo) active + ids provider  
6. Upsert `business_billing`: status `al_dia`, `monthly_amount_cents` **o** amount del plan según interval, `next_due_at` según intervalo, `last_payment_at`  
7. CheckoutSession → `provisioned`  
8. Emitir email “cuenta lista” (best-effort; fallo de mail no revierte provision)

### AD-6 — Auth owner (gap actual)

Hoy el login tenant es **OTP WhatsApp por empleado + `sessions`**. No hay email/password.

v1 self-service **introduce identidad owner por email**:

| Opción evaluada | Decisión |
|-----------------|----------|
| Reusar solo OTP phone | Fricción en signup global (aún no hay business/slug); no elegida como única vía |
| Email + password | **Elegida** para signup y recovery post-pago |
| Magic link only | Posible v1.1; v1 password + email de “cuenta lista” |

**Modelo:**

- Tabla `owner_accounts` (o `users`) con `email` unique, `password_hash`, timestamps  
- Al provisionar: crear employee owner del business **y** link `owner_accounts` ↔ employee/business  
- Login nuevo: `/login` (o `/app/login`) email+password → `session_token` igual que hoy (reusa `sessions` con `employee_id`)  
- Login employee por slug+OTP **no se elimina**  
- Email del checkout es el login; normalizar lower(trim)

Password: hash fuerte (argon2id o bcrypt); nunca loguear plaintext.

### AD-7 — CheckoutSession state machine

```
started → awaiting_payment → paid → provisioned
                ↘ failed | expired | cancelled
awaiting_payment → (IPN PENDING) se mantiene awaiting_payment
paid → (provision error) remains paid + provision_error; reconciler retries → provisioned
```

Reglas:

- `order_id` / `external_id` dLocal = `checkout_sessions.id` (UUID) — **única** clave de correlación  
- Mapear IPN: `status PAID` \| code `200` → intento `payment_succeeded`; `REJECTED` \| `300` → failed; `PENDING` \| `100` → no provisionar  
- Un email puede tener **una** session `awaiting_payment` a la vez; re-abrir reutiliza o expira la anterior  
- `started`/`awaiting_payment` expiran a **T+2h** sin pago (job o lazy); alinear con `expiration` del método si el provider la envía  
- Idempotencia provision: si business ya creado para `checkout_session_id`, no duplicar  
- Unique parcial: a lo sumo un business por `checkout_session_id`  
- Tras redirect, UI puede **poll** session y/o pedir al backend `getPaymentStatus(providerPaymentId)` si el webhook tarda

### AD-8 — Fuente de verdad y antifrágil

1. **Tumo DB** manda estados de checkout, subscription, billing, módulos  
2. dLocal es input confiable solo tras verify webhook  
3. Todo evento provider se guarda en `provider_events` (`provider_event_id` UNIQUE) antes de side effects  
4. `applyProviderEvent` es transaccional e idempotente  
5. Success/failure URLs solo **reanudan** UI (poll o read session status)  
6. Reconciler (cron cada N minutos):  
   - `paid` ∧ ¬`provisioned` → re-provision  
   - provider dice paid y session aún `awaiting_payment` → fetch/sync si API lo permite  
   - `past_due` ∧ now > grace_deadline → pause + billing `vencido`  
7. Chargeback / cancel provider → subscription `cancelled`, billing `vencido` o status dedicado; **no** borrar business ni datos de módulo  
8. Admin **Re-provision** y visibilidad de últimos eventos (ops sin SQL)

### AD-9 — Renovación y mora

- Interval week: `next_due_at = paidAt + 7 days` (UTC; helper nuevo junto a `addOneMonthUTC`)  
- Interval month: reusar `addOneMonthUTC`  
- Pago renovación OK: `al_dia`, avanzar `next_due_at`, `last_payment_at`  
- Fallo renovación: subscription `past_due`, billing `pendiente`, **grace_deadline = failedAt + 48h** (configurable `GRACE_HOURS=48`)  
- Durante gracia: **sigue el acceso** (`pendiente` + due futuro o grace explícita — ver nota abajo)  
- Tras gracia sin pago: billing `vencido`, subscription `paused`; `hasModuleAccess` false (AD existente)  
- Recovery v1: deep link “Regularizar pago” → URL provider o nuevo checkout one-shot de renew ligado a `tenant_subscriptions.id`

**Nota grace vs `hasModuleAccess`:** hoy overdue = `status===vencido` OR `next_due_at <= now`. Para gracia corta sin cortar a los 0ms del due:

- Opción locked: al fallar renew, set `next_due_at = grace_deadline` (empujar due al fin de gracia) **y** `status=pendiente`; al vencer gracia, lazy/reconciler → `vencido`. Así no hay que cambiar el helper en el camino feliz de mora.

### AD-10 — Billing amount semantics (cambio respecto N×6999)

Para tenants con `tenant_subscriptions` active:

- Monto contractual = snapshot del price row al contratar (`amount_ars_cents`, `interval`, `plan_id`, `price_version`)  
- `business_billing.monthly_amount_cents` se reinterpreta como **“amount del ciclo actual en centavos de cobro”** **o** se agregan columnas `cycle_amount_cents`, `billing_interval`, `currency` (preferido: columnas nuevas para no mentir el nombre `monthly_*`)

Para tenants **sin** tenant_subscription (legacy/manual):

- Sigue fórmula admin actual `N × PRICE_PER_MODULE_CENTS` y mark paid manual

### AD-11 — Enfoque de implementación checkout

**Enfoque A (locked):** hosted dLocal + provision por webhook + success URL resume.

No B (embedded fields) ni C (renovación manual permanente) en v1.

### AD-12 — Clientes actuales

No hay cobro formal generalizado. **No grandfather de precios à la carte.**  
Altas nuevas = planes. Existentes (Carri/Defe/…) siguen ops admin hasta migración manual consciente (fuera de MVP).

### AD-13 — Landing

- Sección precios: 3 planes × 2 intervalos (toggle sem/mes)  
- CTA primario → `/signup` (nombre final a definir)  
- FAQ actualiza “¿Cuánto sale?” a planes  
- WhatsApp: secundario (“¿Tenés dudas?”), no “Pedí presupuesto” como único path

## Architecture

```
┌──────────────┐   create session    ┌─────────────────────┐
│ Signup UI    │────────────────────▶│ checkout_sessions   │
│ /signup      │                     │ owner stub          │
└──────┬───────┘                     └──────────┬──────────┘
       │ redirect hosted                        │
       ▼                                        │
┌──────────────┐   webhooks                      │
│ dLocal       │───────────────────▶ applyProviderEvent
└──────────────┘                     │
                                     ▼
                          provision_tenant()
                     businesses, employees, modules,
                     tenant_subscriptions, business_billing
                                     │
                                     ▼
                          Owner login + onboarding wizard
```

### Módulos / carpetas sugeridas (orientativo)

- `shell/billing/plans.ts` — catálogo + cupo validation  
- `shell/billing/pricing.ts` — evolucionar; deprecar N× como única vía  
- `shell/billing/cycle.ts` — `addOneWeekUTC`, grace helpers  
- `shell/billing/provider/types.ts` + `dlocal/`  
- `shell/billing/checkout/` — create session, apply event, provision  
- `modules/signup/` o `modules/onboarding/` — UI  
- `app/api/billing/webhooks/dlocal/route.ts`  
- `app/api/signup/*`  

## Data model (v1)

Nombres de tabla finales pueden ajustarse en migración; semántica locked.

### `plan_prices` (config DB o código versionado)

Si es código v1 OK (`shell/billing/plan-catalog.ts`) con `PRICE_VERSION = 1` y montos ARS explícitos; DB opcional después.

Campos lógicos: `plan_id`, `interval`, `currency`, `amount_cents`, `version`.

### `checkout_sessions`

| Column | Notes |
|--------|-------|
| id | UUID PK (= `order_id` enviado al provider) |
| status | enum state machine |
| email | citext; max one open awaiting_payment |
| password_hash | set at start; used at provision |
| business_name | |
| payer_name | dLocal `payer.name` |
| payer_document | dLocal `payer.document` (DNI/CUIT) |
| plan_id | basic\|pro\|full |
| interval | week\|month |
| module_ids | text[] |
| price_version | int |
| amount_cents | ARS charge snapshot (minor units) |
| currency | `ARS` |
| country | `AR` |
| provider | `dlocal_go` \| `dlocal_platform` |
| provider_checkout_id | payment id or plan/checkout token |
| provider_subscription_id | Go sub id / enrollment id / card_id ref |
| business_id | set at provision |
| provision_error | text nullable |
| expires_at | |
| created_at / updated_at | |

### `tenant_subscriptions`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| business_id | unique active-ish |
| checkout_session_id | |
| plan_id / interval / module_ids snapshot | |
| amount_cents / currency / price_version | |
| status | active\|past_due\|paused\|cancelled |
| provider / provider_subscription_id | |
| grace_deadline_at | nullable |
| current_period_end | mirrors next due |
| created_at / updated_at | |

### `provider_events`

| Column | Notes |
|--------|-------|
| id | UUID |
| provider | |
| provider_event_id | UNIQUE |
| type | |
| external_reference | |
| payload jsonb | |
| processed_at | |
| created_at | |

### `owner_accounts`

| Column | Notes |
|--------|-------|
| id | UUID |
| email | UNIQUE |
| password_hash | |
| created_at | |

Link: `owner_accounts.id` → employee owner row (col `owner_account_id` en `employees` nullable para legacy).

### Existing tables touched

- `businesses` — insert on provision  
- `employees` — owner row  
- `business_module_subscriptions` — same as activateModule  
- `business_billing` — al_dia + cycle fields (+ new interval/amount cols if needed)  
- `sessions` — login owner  

## End-to-end flow

### Happy path

1. Landing → plan → interval → modules → email/password/nombre local + **payer name + document**  
2. `POST /api/signup/checkout` → valida cupo + documento, crea `checkout_sessions` (`awaiting_payment`), `provider.createCheckout` con `order_id=session.id`, `notification_url`, success/callback URLs  
3. Redirect a `redirect_url` / `subscribe_url` (hosted)  
4. Usuario paga; provider puede responder sync `PENDING` o `PAID`  
5. IPN `PAID` → verify HMAC → `provider_events` insert → session `paid` → `provision_tenant` → `provisioned`  
6. Success/callback URL `/signup/continue?session=` → si provisioned, cookie session + wizard; si no, “Activando…” poll (+ opcional retrieve payment)  
7. Wizard: slug, brand opcional, CTA módulo  
8. Dashboard normal  

### Failure paths

| Caso | Comportamiento |
|------|----------------|
| Pago `REJECTED` | error/callback URL; session `failed` o reintentable; mensaje claro |
| IPN solo `PENDING` | no provision; UI espera; expiración de instrucción de pago si aplica |
| Usuario cierra browser post-pago | IPN provisiona; email “cuenta lista” + login |
| Webhook duplicado | unique `provider_event_id` → no-op |
| Firma IPN inválida | 401/400; no side effects |
| Provision falla | session `paid` + error; reconciler + admin re-provision |
| Doble click Pagar | misma session / lock row |
| Email ya owner con business | “ya tenés cuenta → login”; no segundo commerce |
| Renew fail | past_due + grace 48h; luego vencido |
| Chargeback | cancelled + vencido; datos intactos |
| Cuenta provider sin recurring AR | bloqueo de ship MVP (AD-4 gate); no degradar en silencio |

## Onboarding wizard (mínimo)

Rutas bajo dashboard owner, flag `onboarding_completed_at` null.

1. Slug (unique; default from name sanitized)  
2. Primary color / logo optional skip  
3. Cards “Configurá {módulo}” → rutas existentes settings  
4. Skip global permitido excepto slug si la URL pública lo requiere  

Acceso a módulos **ya** activo sin completar wizard.

## Admin v1

- Lista checkout sessions (filter status, email)  
- Detalle: eventos provider, botón Re-provision  
- Business detail: mostrar `tenant_subscription` (plan, interval, status, provider id)  
- Legacy mark paid permanece para no-self-service  

## Security

- Webhook verify **HMAC-SHA256** según producto (Go: apiKey+body; Platform: X-Login+X-Date+body) — implementar contra docs vigentes, tests con vectors de sandbox  
- Rate limit create checkout por IP + email  
- No exponer secret keys / X-Trans-Key al client  
- Password hash server-only; `payer.document` tratado como PII (no logs de request completos)  
- CSRF estándar en APIs cookie  
- Admin re-provision solo staff auth existente (`010_tumo_admin`)  

## Observability

- Structured logs: session id, event id, business id (no PAN)  
- Métricas mínimas: checkout_started, payment_ok, provision_ok, provision_fail, renew_fail, grace_expired  
- Alert: spike provision_fail o cola `paid` unprovisioned > threshold  

## Testing strategy

| Layer | Cases |
|-------|-------|
| Unit | cupo validation; price catalog; grace/next_due week+month; hasModuleAccess con grace via due push |
| Unit | state transitions checkout; applyProviderEvent idempotent |
| Integration | provision creates business+owner+modules+billing once |
| API | webhook auth failure 401; replay 200 |
| UI | signup cupo limits; continue page states (pending/ready/error) |

TDD obligatorio del repo: tests rojos antes de implementación por story.

## Rollout

1. Validar en cuenta dLocal: hosted checkout AR + recurring + webhooks sandbox  
2. Migraciones + provider sandbox  
3. Signup feature flag `SELF_SERVICE_SIGNUP=true`  
4. Landing CTA detrás de flag  
5. Soft launch internos → primeros comercios reales  
6. Apagar CTA WhatsApp primario cuando conversión estable  

## Open points (resolved defaults — change only if product rejects)

| Topic | Default locked |
|-------|----------------|
| Grace duration | 48 hours |
| Full + new modules mid-cycle | no auto-attach v1 |
| ARS amounts | fixed list in config (ops-updated), not live FX per request |
| Owner phone | optional later; v1 email login (OTP employees unchanged) |
| Slug at checkout | no; wizard after pay |
| Email provider | stack available or queue log + admin resend |
| **Which dLocal product** | **Account gate before adapter code** — prefer Go Subscriptions if enabled; else Platform REDIRECT + MIT/enrollment |
| Payer document | required at signup (AR) |
| Payment methods v1 | Card via hosted/redirect primary; APMs ( Rapipago, transfer, etc.) **out** unless Go checkout los ofrece sin trabajo extra |
| Amount minor units | Store integer cents; convert to provider major units (e.g. `129.99`) at API boundary per docs |

## Success metrics (product)

- % landing CTA → checkout started  
- % checkout started → paid  
- % paid → provisioned (< 2 min p95)  
- Activated module configured in 7 days  
- Renew fail rate; % recovered within grace  
- Support contacts “no puedo entrar / pagué y nada” → debería tender a 0  

## Section index (design narrative)

1. **Domain / architecture** — Tumo SoT, plans, provider port, billing reuse  
2. **E2E flow** — signup screens, webhook-first provision, wizard  
3. **Data + dLocal contracts** — tables, events, amounts ARS  
4. **Failure / antifragile** — idempotency, reconciler, grace, chargeback  
5. **Auth gap** — owner email/password alongside employee OTP  
6. **Legacy** — admin N× path remains; no formal grandfather  
7. **MVP scope** — hard MVP; no self-serve plan changes  

---

## Spec self-review

### Pass 1 — initial write (2026-09-16)

| Check | Result |
|-------|--------|
| Placeholders | Defaults locked; no bare TBD in acceptance |
| Contradictions | N×6999 legacy vs plan amount (AD-10); grace via due-push (AD-9); Full no mid-cycle auto-attach |
| Scope | One product contract; implementation plan must story-split |
| Ambiguity | Owner role = existing full-access employee role at implement time |

### Pass 2 — Context7 docs alignment (2026-09-16)

Fuentes: [dLocal Payins](https://docs.dlocal.com) (`/websites/dlocal`), [dLocal Go Integration API](https://docs.dlocalgo.com) (`/websites/dlocalgo_integration-api`).

| Finding | Spec change |
|---------|-------------|
| **Two products (Go vs Platform)** with different auth, URLs, and recurring models | AD-4 rewritten: account gate; prefer Go Subscriptions; Platform = REDIRECT + card/enrollment MIT; provider enum `dlocal_go` \| `dlocal_platform` |
| Recurring on Platform is **not** automatic global billing — enrollments / saved cards / MIT; merchant often initiates charge | AD-4 + `chargeRenewal?`; ship gate requires sandbox renew proof |
| Go has first-class **`POST /plans`** + `frequency_type` WEEKLY/MONTHLY + `subscribe_url` | Preferred path when account is Go |
| Payins AR require **`payer.document`** (+ name, email) | AD-4b; signup fields; checkout_sessions columns |
| Correlation id = **`order_id`** | AD-7; table note |
| Async final status: PENDING→PAID/REJECTED; codes 100/200/300 | AD-7 mapping; ProviderEvent.statusCode; no provision on PENDING |
| Redirect vs IPN: `callback_url` / `success_url` + `notification_url` | Happy path + failure table |
| Webhook HMAC differs slightly Go vs Platform | Security section |
| `GET /payments/{id}` for retrieve | Reconciler / continue page |
| Smart Fields = embedded card token PCI path | Explicitly v2; v1 hosted/redirect only |
| Argentina APMs (IO, RP, PF, MU, QR…) | Out of MVP unless free via hosted; card primary |

| Check | Result after pass 2 |
|-------|----------------------|
| Fake endpoints | Removed vague “hosted checkout” only; mapped to real fields/flows without inventing undocumented AR subscription endpoints on Platform |
| Contradictions | “dLocal subscriptions always exist” → **conditional on product**; MVP still requires recurring somehow, with explicit non-ship if account lacks it |
| PII | document field + log caution |
| Still ambiguous | Exact Go vs Platform **until human confirms account type** — called out as implementation gate, not silent assumption |

No remaining acceptance TBD. Ready for user review + commit.
`)