# Checklist go-live — SaaS signup + Mercado Pago real

**Repo:** `Estudio-Nomade/tumo-app`  
**Branch a mergear:** `feat/saas-mp-subscriptions` → `main`  
**Prod host:** `https://www.tumo.com.ar`  
**No commitear secretos.** Este doc es solo ops.

---

## 0. Antes de tocar prod (vos)

- [ ] Tener acceso Vercel al proyecto Tumo + panel MP Developers de la app **platform** Tumo.
- [ ] Tener `DATABASE_URL` de **prod** (Supabase/Vercel) a mano — no la de localhost.
- [ ] Decidir: primer e2e con **`TEST-`** (sandbox) o **`APP_USR-`** (plata real). Preferí TEST si la cuenta lo permite.
- [ ] Leer este checklist completo una vez.

---

## 1. Merge código a main

1. Abrí el PR: `feat/saas-mp-subscriptions` → `main` (si ya está abierto, usá esa URL).
2. Esperá CI verde (si hay Actions).
3. Merge (merge commit o squash — lo que usen en el repo; **no** force-push main).
4. Confirmá en GitHub que `main` tiene:
   - `app/signup/**`
   - `app/api/billing/webhooks/mercadopago/**`
   - `shell/billing/provider/mercadopago/**`
   - migraciones `017` `018` `019`

**No pongas aún** `SELF_SERVICE_SIGNUP=true` en prod hasta el paso 5–6 (podés deployar código con flag off y CTA sigue WA).

---

## 2. Deploy Vercel

1. Si Vercel está linkeado a `main`: el merge dispara deploy solo.
2. Si no: `vercel --prod` desde máquina con auth del proyecto (o redeploy desde dashboard).
3. Anotá la URL de prod: `https://www.tumo.com.ar` (y `www` vs apex — usá **una** canónica sin trailing slash).

Smoke post-deploy (flag todavía puede estar off):

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://www.tumo.com.ar/
# si el código ya está, la ruta existe aunque redirija:
curl -sS -o /dev/null -w "%{http_code}\n" https://www.tumo.com.ar/signup
curl -sS https://www.tumo.com.ar/api/billing/webhooks/mercadopago
# esperable con código nuevo: {"ok":true,"provider":"mercadopago"} o 403 si flag off en route
```

---

## 3. Migrar Postgres de **prod**

Las tablas SaaS **no** se crean solas.

1. Sacá `DATABASE_URL` de Vercel → Settings → Env → Production (o Supabase connection string del proyecto **prod**).
2. En tu máquina (sin pegar la URL en chats):

```bash
export PATH="$HOME/.bun/bin:$PATH"
cd "/home/marti/Documentos/Estudio Nomade/Tumo"
git checkout main && git pull origin main

# pegá SOLO en tu terminal, no en el chat:
export DATABASE_URL='postgresql://…prod…'
bun shell/db/migrate.ts
```

3. Verificá en SQL (Supabase SQL editor o `psql`):

```sql
select to_regclass('public.tenant_subscriptions');
select to_regclass('public.checkout_sessions');
select to_regclass('public.provider_events');
select to_regclass('public.owner_accounts');
```

Las 4 deben devolver nombre de tabla, no `null`.

**Pitfall:** migrar localhost `:5432` y creer que prod está listo. Siempre la URL de **prod**.

---

## 4. Env en Vercel (Production)

En Vercel → Project → Settings → Environment Variables → **Production**  
(y Preview solo si querés probar previews; no mezcles localhost).

| Key | Valor | Notas |
|-----|--------|--------|
| `BILLING_PROVIDER` | `mercadopago` | Sin esto = fake / no cobro real |
| `SELF_SERVICE_SIGNUP` | `false` al principio, `true` al abrir | Ver paso 6 |
| `NEXT_PUBLIC_SELF_SERVICE_SIGNUP` | igual que arriba | Landing CTA |
| `APP_BASE_URL` | `https://www.tumo.com.ar` | **Sin** `/` final |
| `NEXT_PUBLIC_APP_URL` | **igual** que `APP_BASE_URL` | back_urls + links |
| `MP_ACCESS_TOKEN` | `TEST-…` o `APP_USR-…` | Platform Tumo, no token de un local |
| `MP_WEBHOOK_SECRET` | secret del panel MP | Si está vacío, se salta firma (dev). En prod **ponelo** |
| `MP_PUBLIC_KEY` | `APP_USR-…` / TEST pk | Opcional v1 |
| `MP_PREFER_SANDBOX` | `true` solo con TEST | Con `APP_USR-` dejá `false` o sin set |
| `DATABASE_URL` | ya debería existir | Confirmar que es la misma DB migrada |

Tras guardar: **Redeploy** Production (env solo se aplica en build/runtime nuevo).

**Nunca:**

- `APP_BASE_URL=http://localhost:3000` en prod  
- `APP_BASE_URL` con ngrok viejo  
- keys con espacio al inicio (` MP_ACCESS_TOKEN`)

---

## 5. Webhook en Mercado Pago

1. [MP Developers](https://www.mercadopago.com.ar/developers) → tu aplicación **Tumo platform**.
2. Webhooks / notificaciones → URL:

```text
https://www.tumo.com.ar/api/billing/webhooks/mercadopago
```

3. Eventos: al menos **Payments** (`payment`).
4. Copiá el secret de firma → Vercel `MP_WEBHOOK_SECRET` si aún no está → redeploy.
5. Probe:

```bash
curl -sS https://www.tumo.com.ar/api/billing/webhooks/mercadopago
# ideal: {"ok":true,"provider":"mercadopago"}
```

---

## 6. Encender self-serve (soft launch)

Cuando migrate + env MP + webhook estén OK:

1. Vercel: `SELF_SERVICE_SIGNUP=true` y `NEXT_PUBLIC_SELF_SERVICE_SIGNUP=true`
2. Redeploy
3. Hard refresh home:

```bash
curl -sS https://www.tumo.com.ar/ | grep -o 'href="/signup?plan=[^"]*"' | head
# debe haber /signup?plan=basico|pro|full — NO solo wa.me
```

4. Abrí en browser privado:  
   `https://www.tumo.com.ar/signup?plan=basico`

---

## 7. E2E de pago (obligatorio antes de avisar clientes)

1. Completá signup (email nuevo, pass ≥6, local, nombre, módulos).
2. **Continuar al pago** → debe abrir **mercadopago.com.ar** (no “Pagar demo”).
3. Pagá:
   - Sandbox/`TEST-`: tarjetas de prueba MP  
   - `APP_USR-`: **cobro real** — usá monto chico / cuenta de prueba tuya
4. Volvé a `/signup/continue?session=…` → estado **¡Listo!** / provisioned.
5. Admin: `https://www.tumo.com.ar/admin/businesses` → el negocio con plan + suscripción.
6. Si pagó OK en MP pero continue queda colgado:
   - Revisá logs Vercel del webhook  
   - Revisá que `APP_BASE_URL` sea exactamente el host público  
   - Revisá `provider_events` / `checkout_sessions` en SQL

---

## 8. Si algo falla (atajos)

| Síntoma | Qué mirar |
|---------|-----------|
| CTA sigue WhatsApp | Flag `NEXT_PUBLIC_SELF_SERVICE_*` + redeploy + hard refresh; `app/page.tsx` force-dynamic |
| Continuar → “Error de red” | DB prod down / mal `DATABASE_URL` / faltan migraciones |
| Continuar → fake demo | `BILLING_PROVIDER` no es `mercadopago` o falta `MP_ACCESS_TOKEN` en **ese** deploy |
| Preference 400 | `auto_return` + URL no https (prod debe ser https) |
| Pagó y no provisiona | Webhook URL / secret / `APP_BASE_URL` wrong host |
| ERR_NGROK en local | Tunnel muerto en `.env.local` — no uses eso en prod |

---

## 9. Qué NO esperar en v1 (OK dejar para después)

- Login owner solo con email+password (hoy hay phone sintético post-provision)
- Renovación automática / Preapproval
- Reconciler si MP no manda webhook
- Upgrade/downgrade de plan self-serve

---

## Orden corto (imprimible)

1. Merge PR saas → main  
2. Deploy Vercel  
3. `bun shell/db/migrate.ts` contra **prod**  
4. Env MP + `APP_BASE_URL=https://www.tumo.com.ar` + redeploy  
5. Webhook MP → `/api/billing/webhooks/mercadopago`  
6. Flag self-serve `true` + redeploy  
7. Un pago e2e  
8. Recién ahí: avisar comercios / bajar WA como puerta principal  
