# SaaS MP — DB local vs real (friend)

## Policy

| Ambiente | Quién | Cómo |
|----------|-------|------|
| **Local** (esta máquina) | Nosotros | Docker `postgres:15` en **:5432** vía `docker compose up -d db` + `bun shell/db/migrate.ts` |
| **Real** (Supabase del amigo) | Él (o nosotros con su `DATABASE_URL`) | Solo cuando digamos; checklist en `scripts/saas-mp-db-migrate-checklist.sh` |

No hardcodear ni commitear la URL real. No asumir que `.env.local` apunta al compose: hoy suele ser **:54322** (Supabase CLI). Compose local = **:5432**.

## Local — comandos

```bash
export PATH="$HOME/.bun/bin:$PATH"
cd ~/Documentos/Estudio\ Nomade/Tumo

# full up + migrate
bash scripts/local-db-up.sh

# optional demo row plan Pro for admin UI
bash scripts/local-db-up.sh --seed-demo-saas

# app session against local compose
export DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable'
bun run dev
# admin: http://localhost:3000/admin/businesses  → Demo SaaS Local / plan Pro
```

Verify table:

```bash
docker exec tumo-supabase-db psql -U postgres -d postgres -c '\d tenant_subscriptions'
```

## Real DB — qué migrar (checklist vivo)

### Ya en repo / local aplicado

| # | Artefacto | Acción en real |
|---|-----------|----------------|
| 1 | `shell/db/migrations/017_saas_tenant_subscriptions.sql` | Crear `tenant_subscriptions` |
| 2 | Mirror `supabase/migrations/20261005120000_saas_tenant_subscriptions.sql` | Mismo SQL vía CLI push o SQL editor |
| 3 | App branch `feat/saas-mp-subscriptions` | Deploy código que lee `saas_subscription` en admin |
| 4 | `shell/db/migrations/018_saas_checkout_sessions.sql` | `checkout_sessions` + `provider_events` |
| 5 | Mirror `supabase/migrations/20261005130000_saas_checkout_sessions.sql` | Idem |

### Aún NO (siguiente slices — agregar acá al cerrarlos)

| # | Artefacto | Notas |
|---|-----------|--------|
| 6 | Adapter MP real (`MP_ACCESS_TOKEN`) | Preferences API + webhook verify |
| 7 | `owner_accounts` + link employee | Login email self-serve |
| 8 | Provision post-pago | business + modules + tenant_subscriptions |
| 9 | UI `/signup` + landing CTA flag | |
| 10 | Env `MP_*`, `SELF_SERVICE_SIGNUP` en Vercel | Secrets |
| 11 | Webhook URL pública | `https://…/api/billing/webhooks/mercadopago` |

### Cómo aplicar en real (amigo)

```bash
# CHECK (no escribe)
DATABASE_URL='postgresql://…pooler…' bash scripts/saas-mp-db-migrate-checklist.sh

# APPLY — OJO: migrate.ts corre 001→017 con IF NOT EXISTS.
# En prod madura preferir pegar SOLO el SQL de 017 en SQL editor.
DATABASE_URL='…' bash scripts/saas-mp-db-migrate-checklist.sh --apply
```

Opcional solo 017:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f shell/db/migrations/017_saas_tenant_subscriptions.sql
```

### Verify real

```sql
SELECT to_regclass('public.tenant_subscriptions');
SELECT plan_id, status, subscribed_at FROM tenant_subscriptions LIMIT 5;
-- legacy sin fila = cobro manual (esperado)
```

## Notas

- **017 no backfillea** negocios viejos → admin “manual” OK.
- SaaS MP ≠ MP de Pedidos (orders drop 011).
- Montos ARS en `plan-catalog` son placeholder hasta que ops fije lista.
