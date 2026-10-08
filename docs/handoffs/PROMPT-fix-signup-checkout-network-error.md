# PROMPT — Fix: signup “Continuar al pago” → “Error de red. Reintentá”

**Modo:** fix (TDD + root-cause first; browser smoke obligatorio)  
**Repo:** `/home/marti/Documentos/Estudio Nomade/Tumo`  
**Package:** `tumo-app` (bun + Next 16)  
**Branch base:** `feat/saas-mp-subscriptions` (re-check `git branch` / si signup ya está en main)  
**Nueva branch:** `fix/signup-checkout-network-error`  
**Remote:** `Estudio-Nomade/tumo-app` (no Tubi)

---

## Síntoma (humano)

> Cuando completo los datos para registrarme en Tumo y comprar una suscripción de un módulo, al apretar **Continuar al pago** sale **“Error de red. Reintentá”**.

UI: `/signup` o `/signup?plan=basico|pro|full` → CTA del form.

---

## Evidencia ya medida (2026-10-08, no re-inventar)

Repro local contra dev en `:3000`:

```bash
curl -sS -D- -o /tmp/signup-b.txt -w "HTTP:%{http_code}\n" \
  -H 'content-type: application/json' \
  -d '{"email":"test@example.com","password":"secreto123","businessName":"Local","payerName":"Test","planId":"basico","moduleIds":["loyalty"]}' \
  http://127.0.0.1:3000/api/signup/checkout
```

**Resultado observado:**
- `HTTP 500` en ~40ms  
- **Body vacío** (no JSON)  
- Log Next: `⨯ Error: connect ECONNREFUSED 127.0.0.1:5432`

Env al momento del repro (nombres; **no** loguear secretos):

| Var | Valor visto |
|-----|-------------|
| `DATABASE_URL` | host `127.0.0.1` / compose **:5432** |
| `BILLING_PROVIDER` | `fake` |
| `SELF_SERVICE_SIGNUP` | `true` |
| `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` | `https://rigid-deskbound-imaging.ngrok-free.dev` |
| `MP_ACCESS_TOKEN` | seteado `APP_USR-…` (prod) |

**Conclusión primaria:** no es “la red del usuario”. Falló **Postgres local** (`ECONNREFUSED :5432`). El unhandled throw en el route → 500 sin body → el client hace `res.json()` y cae al `catch` genérico → copy mentirosa **“Error de red”**.

---

## Acceptance

### A. Root cause cerrada (ops + code)
1. Con DB up + migrada (017–019), `POST /api/signup/checkout` válido → **200** + `{ sessionId, redirectUrl, providerCheckoutId }`.
2. Browser: Continuar al pago **redirige** (fake → `/api/billing/fake-checkout/...` o MP `init_point` si provider real). **No** muestra “Error de red” en happy path.
3. Si DB cae de nuevo: UI **no** dice “Error de red”; muestra error/código usable (ej. “No pudimos guardar el alta. Revisá la base / reintentá.” + `code`).

### B. Robustez API + form (obligatorio en el mismo PR)
4. `app/api/signup/checkout/route.ts` **try/catch** alrededor de `postSignupCheckout`: cualquier throw → `NextResponse.json({ error, code }, { status: 500|503 })` — **nunca** body vacío.
5. `signup-form.tsx`:  
   - `res.json()` en try; si body inválido, mostrar status + mensaje genérico de servidor (no “red”).  
   - `catch` de `fetch` real (TypeError/network) → “Error de red…” OK.  
   - Si `!res.ok` y hay `data.error`, mostrar **ese** string (ya parcialmente; no pisar con red).
6. Test(s) TDD:
   - form/handler: JSON 500 con `{ error, code }` → UI muestra `error`, no copy de red.  
   - form: `fetch` reject → copy de red.  
   - opcional: route catch devuelve JSON.

### C. Fuera de “solo ops”
7. Documentar en comentario corto del handoff/PR: checklist local DB (`scripts/local-db-up.sh`, `DATABASE_URL` :5432 vs :54322, restart Next tras env).

### D. Verify
8. `bun test` scoped green + eslint archivos tocados.  
9. Browser smoke localhost (y ngrok si lo usan) con DB up.

---

## Paths exactos

| Qué | Path |
|-----|------|
| Form + copy mentirosa | `modules/signup/public/signup-form.tsx` (`catch` → “Error de red. Reintentá.”; `fetch("/api/signup/checkout")`) |
| Route thin (sin try/catch hoy) | `app/api/signup/checkout/route.ts` |
| Domain | `modules/signup/api/checkout.ts` → `postSignupCheckout` |
| Deps | `modules/signup/lib/default-deps.ts` (`sql`, `createBillingProvider`, flags) |
| startCheckout | `shell/billing/checkout/start.ts` (INSERT session + provider; provider catch → `provider_error`) |
| Pool | `shell/db/pool.ts` (`DATABASE_URL`, ssl pooler only) |
| Fake pay | `app/api/billing/fake-checkout/[pref]/route.ts` |
| MP adapter (si existe en branch) | `shell/billing/provider/mercadopago/*` |
| Factory | `modules/signup/lib/provider.ts` |
| Flags | `modules/signup/lib/flags.ts` |
| Migras SaaS | `shell/db/migrations/017_*.sql` … `019_*.sql` + `shell/db/migrate.ts` |
| Local DB script | `scripts/local-db-up.sh` |
| Pitfalls | skill `tumo-dev-pitfalls` → `references/saas-mp-subscriptions.md`, `saas-mp-db-local-vs-real.md` |

---

## Hipótesis rankeadas (probar en orden)

| # | Hipótesis | Cómo confirmar | Fix class |
|---|-----------|----------------|-----------|
| **H1** | Postgres down / mal puerto → `ECONNREFUSED :5432` o `:54322` | Log Next + `ss -ltn \| grep 543`; `docker ps` / compose | `bash scripts/local-db-up.sh` (o supabase CLI); alinear `DATABASE_URL` al puerto real; `bun shell/db/migrate.ts`; **restart** `bun run dev` |
| **H2** | Route tira unhandled → 500 body vacío → `res.json()` throw → copy “red” | curl como arriba | try/catch JSON en route + form parse seguro |
| **H3** | Tabla/mig falta (`checkout_sessions` 42P01) | log SQL / migrate | migrate 017–019 en **la misma** URL que Next |
| **H4** | `provider_error` (MP Preference fail) | body `{ code: "provider_error" }` | **no** es red; mostrar ese error; chequear token/API; factory real vs fake |
| **H5** | Flag self-service off → 403 | body `self_service_off` | env flag + restart |
| **H6** | Usuario abre **ngrok** pero Next muerto / otro puerto | Network tab failed fetch | un solo Next en :3000; ngrok → 3000 |
| **H7** | CORS/mixed content (https ngrok → http API) | Network | same-origin vía ngrok a Next; no hardcode localhost en fetch del form (ya es relative `/api/...` OK) |

**Al momento del bug report, H1+H2 estaban CONFIRMADAS.** Empezá por re-probar curl; si DB ya está up, cerrá H2 en código igual (regresión de UX).

---

## Implementación (KISS)

### 1) Ops primero (antes de features)
```bash
export PATH="$HOME/.bun/bin:$PATH"
cd "/home/marti/Documentos/Estudio Nomade/Tumo"

# DB
bash scripts/local-db-up.sh
# o el camino CLI :54322 — PERO .env.local debe coincidir con el puerto real

# Ver puerto
ss -ltn | grep 543 || true
# DATABASE_URL solo host/puerto (no imprimir password en logs del PR):
node -e "const u=process.env.DATABASE_URL||''; console.log(u.replace(/:[^:@/]+@/,':***@'))" 

bun shell/db/migrate.ts

# Dev: un solo proceso :3000
fuser -k 3000/tcp 2>/dev/null || true
bun run dev
```

Re-curl checkout → debe 200 con fake.

### 2) Código (TDD)
- RED: test UI o unit del parse de error (mock fetch 500 JSON vs reject vs 500 empty).  
- GREEN:  
  - `route.ts` wrap try/catch → siempre JSON. Mapear mensajes con `code`: `db_unavailable` si message match ECONNREFUSED/ENOTFOUND (opcional, KISS).  
  - `signup-form.tsx`:  
    ```ts
    let data: { error?: string; code?: string; redirectUrl?: string } = {}
    try { data = await res.json() } catch { /* empty body */ }
    if (!res.ok) {
      setError(data.error ?? `No se pudo iniciar el checkout (${res.status}).`)
      return
    }
    ```
    `catch` externo solo para fallo de red real.
- No cambiar contract de éxito.
- **No** secrets en commits / logs.

### 3) Factory MP (chequeo, no scope creep)
En el working tree a veces `provider.ts` **sigue cayendo a fake** aunque exista `shell/billing/provider/mercadopago/`. Si el humano tiene `BILLING_PROVIDER=mercadopago` y espera Preference real:
- Wire `createMercadoPagoProvider` cuando hay token (ver plan `docs/superpowers/plans/2026-10-08-saas-mp-real-adapter-webhook.md` si está).  
- Eso es **secundario** al bug “Error de red” con DB down. Primero H1+H2.  
- Si solo fake: redirect debe ir a `http://localhost:3000/api/billing/fake-checkout/...` (o APP_BASE_URL). Con `APP_BASE_URL=ngrok`, success/notification URLs usan ngrok — OK si tunnel vive.

### 4) Anti-scope
- No rediseñar UX plan/módulos (otro handoff: `PROMPT-fix-signup-plan-modules-ux.md`).  
- No owner login email.  
- No renew/preapproval.  
- No `git add -A` (marketing/flyer untracked).  
- No pegar `MP_ACCESS_TOKEN` en chat/PR.  
- No culpar Keeper hydration (extensión) por este síntoma de CTA.

---

## Verify checklist

```bash
export PATH="$HOME/.bun/bin:$PATH"
cd "/home/marti/Documentos/Estudio Nomade/Tumo"

# API happy
curl -sS -w "\nHTTP:%{http_code}\n" -H 'content-type: application/json' \
  -d '{"email":"ok@test.com","password":"secreto123","businessName":"X","payerName":"Y","planId":"basico","moduleIds":["loyalty"]}' \
  http://127.0.0.1:3000/api/signup/checkout
# expect 200 + redirectUrl

bun test tests/signup-checkout-api.test.ts tests/ui/signup-*.test.tsx  # + los que agregues
bunx eslint app/api/signup/checkout/route.ts modules/signup/public/signup-form.tsx

# Browser
# http://localhost:3000/signup?plan=basico → llenar → Continuar al pago → redirect fake/MP
# DevTools Network: POST /api/signup/checkout status + JSON body
```

**Done ≠ solo Jest:** hard refresh + Network tab obligatorio.

---

## Git / PR

- Commit: `fix(signup): surface checkout errors; stop masking DB failures as network`  
- Stage solo route/form/tests (+ provider wire si tocás).  
- PR summary: root cause ECONNREFUSED + empty 500 → misleading copy; fix catch + JSON + local DB checklist.

---

## Skills / reglas repo

- `AGENTS.md`: BMAD + TDD  
- `tumo-dev-pitfalls` (SaaS signup, 5432 vs 54322, fake vs MP, turbopack.root)  
- Bun: `export PATH="$HOME/.bun/bin:$PATH"`

---

## Done cuando

- [ ] curl checkout 200 con DB up  
- [ ] UI ya no miente “Error de red” en 500 JSON/DB  
- [ ] 500 siempre JSON desde route  
- [ ] tests + eslint scoped  
- [ ] browser smoke Continuar al pago → redirect  
