# PROMPT — Fix: signup pierde datos al “Continuar al pago” / volver

**Modo:** fix UX (BMAD + TDD RED→GREEN; browser smoke obligatorio)  
**Repo:** `/home/marti/Documentos/Estudio Nomade/Tumo`  
**Package:** `tumo-app` (bun + Next 16)  
**Remote:** `Estudio-Nomade/tumo-app` (**no** Tubi)  
**Base branch:** `feat/saas-mp-subscriptions` **después** de mergear PR **#42**  
  (`fix/signup-checkout-network-error` — errores checkout ya no se enmascaran como “red”).  
  Si #42 aún no mergeó: rebaseá/stackeá sobre `origin/fix/signup-checkout-network-error` o esperá el merge; **no** reimplementes el fix de red.  
**Branch de trabajo (ya creada local/remoto si pusheada):** `fix/signup-form-draft-persist`  
**PR target:** `feat/saas-mp-subscriptions` (signup todavía **no** vive en `main`)

---

## Kickoff (humano → peer)

```
Leé y ejecutá SOLO:
/home/marti/Documentos/Estudio Nomade/Tumo/docs/handoffs/PROMPT-fix-signup-form-draft-persist.md

Repo Tumo tumo-app. Branch fix/signup-form-draft-persist.
Base feat/saas-mp-subscriptions post-PR #42 (network-error).
Síntoma: al Continuar al pago / volver a /signup hay que rellenar todo.
No es bug de checkout ni de red: falta draft en client.
BMAD + TDD. PR a feat/saas-mp-subscriptions. No main. No secrets.
```

---

## Síntoma (humano)

> Apreto **Continuar al pago** y me hace **llenar de nuevo** los datos para la suscripción. ¿Q onda?

Flujo: `/signup` o `/signup?plan=…` → completa local / nombre / email / pass / módulos → Continuar → sale a fake MP o MP real → **atrás**, refresh, “Volver al signup”, o failure en continue → form **vacío** otra vez.

---

## Root cause CONFIRMADA (2026-10-08) — no re-investigar

| Hecho | Evidencia |
|-------|-----------|
| Form = solo `useState` | `modules/signup/public/signup-form.tsx` — sin `sessionStorage` / cookie / draft |
| Success = full navigation | `window.location.assign(data.redirectUrl)` → se pierde el mount |
| Failure link = plan only | `continue-client.tsx` → `/signup?plan=${data.plan_id}` |
| API happy path OK | `POST /api/signup/checkout` → 200 + `redirectUrl` con DB up |
| **No** es regresión de #42 | #42 solo JSON/errores; no toca persistencia de campos |

**No es:** Wi‑Fi, MP roto, Postgres, “el POST borra el form en el mismo mount” (si `!res.ok` y no navega, el state **se mantiene**).

Pitfall doc: skill `tumo-dev-pitfalls` → `references/saas-mp-subscriptions.md` § *Continuar al pago y al volver hay que rellenar todo*.

---

## Acceptance

1. Llenar form → Continuar al pago → fake checkout → **atrás del browser** a `/signup` → campos **prefill** (negocio, nombre, email, plan, módulos).  
2. Pago fail → “Volver al signup” → mismo prefill (al menos plan + draft).  
3. **Password:** **no** persistir en plain storage de larga duración. Preferencia producto: **omitir password del draft** (usuario re-tipea solo la pass) **o** TTL corto ≤15–30 min + clear explícito. Documentar la elección en PR.  
4. Tras **provisioned** exitoso (continue “¡Listo!”): clear draft.  
5. `?plan=` en URL sigue ganando como **initial plan** si el user llega fresh desde landing; si hay draft, plan del draft gana salvo que quieras merge simple: **URL plan override solo si no hay draft** (elegí una regla, testeala).  
6. TDD: helper(s) de draft puros + tests; form cableado mínimo.  
7. Browser smoke localhost obligatorio (Jest/unit green ≠ done).  
8. `bun test` scoped + eslint archivos tocados.  
9. Conventional commit + PR a `feat/saas-mp-subscriptions` con root-cause 3–5 líneas.

---

## Scope IN

| Área | Paths |
|------|--------|
| Draft helper (nuevo) | `modules/signup/public/signup-draft.ts` (o similar bajo `public/`/`lib/`) — load/save/clear, key estable, version schema |
| Form | `modules/signup/public/signup-form.tsx` — restore on mount; save on change y/o antes de `location.assign` |
| Continue (opcional clear) | `modules/signup/public/continue-client.tsx` — clear draft cuando `status === "provisioned"` |
| Tests | `tests/signup-draft.test.ts` y/o extender `tests/ui/signup-form.test.tsx` |
| Spec BMAD corto | `_bmad-output/implementation-artifacts/spec-fix-signup-form-draft-persist.md` status done al cerrar |
| Handoff | este archivo (ya existe) |

## Scope OUT

- No reabrir fix de red (#42 / `checkout-route-error`).  
- No MP Preference / webhook / provision / owner login.  
- No cambiar `startCheckout` / schema `checkout_sessions` salvo que sea estrictamente necesario (no lo es).  
- No `next.config.ts` / marketing / flyer / dirty untracked.  
- No push a `main`.  
- No guardar password en URL query.  
- No `git add -A` (hay untracked marketing/design en el tree del humano).

---

## Diseño KISS (recomendado)

```ts
// shape ilustrativo — el peer implementa y testea
type SignupDraftV1 = {
  v: 1
  savedAt: number
  planId: "basico" | "pro" | "full"
  moduleIds: string[]
  businessName: string
  payerName: string
  email: string
  // password?: NEVER long-lived plain — omit
}

const KEY = "tumo_signup_draft_v1"
const TTL_MS = 2 * 60 * 60 * 1000 // opcional
```

- `sessionStorage` preferible a `localStorage` (tab-scoped; menos basura cross-session).  
- `saveDraft` en cada change relevante **y** justo antes de `location.assign` (por si el change batch no flushó).  
- `loadDraft`: JSON parse safe; invalid → null; TTL expired → clear + null.  
- SSR: no tocar storage en render inicial del server — init state vacío/`defaultModules` y restore en efecto **o** lazy init solo en client con pattern que no rompa lint (`set-state-in-effect` / hydration). Preferí **lectura en `useState` initializer solo si `typeof window !== "undefined"`** con cuidado de hydration mismatch: inputs controlados con default vacío en SSR + restore post-mount es OK si no choca con React 19 rules del repo. Mirá patterns existentes (orders cart usa `useSyncExternalStore`). Para draft simple: restore en `useEffect` **una vez** suele ser aceptable si el linter lo permite; si no, external store o `useSyncExternalStore` stub.  
- Clear: `clearSignupDraft()` en continue provisioned + opcional botón “Empezar de cero” (nice-to-have, no mandatory).

---

## TDD (obligatorio)

**RED primero:**

1. `loadDraft` vacío → null.  
2. `saveDraft` + `loadDraft` roundtrip (sin password).  
3. payload corrupto / version ≠ 1 → null + clear.  
4. TTL vencido → null.  
5. (si testeable) form restore: mock storage → initial values reflejan draft (unit del helper alcanza si el form solo llama helper).

**GREEN:** implement helper + wire form mínimo.  
**REFACTOR:** sin scope creep.

Rules repo: `AGENTS.md` — BMAD mandatory + TDD; prefer shadcn solo si hace falta (acá no).

---

## Verify

```bash
export PATH="$HOME/.bun/bin:$PATH"
cd "/home/marti/Documentos/Estudio Nomade/Tumo"

# DB + dev (si no están)
# bash scripts/local-db-up.sh
# DATABASE_URL al puerto vivo; bun shell/db/migrate.ts
# bun run dev → :3000

bun test tests/signup-draft.test.ts tests/ui/signup-form.test.tsx tests/signup-checkout-errors.test.ts
# eslint scoped a files tocados

# Browser smoke
# 1. /signup?plan=pro → llenar todo → Continuar al pago
# 2. fake page visible → browser Back
# 3. campos vuelven (pass vacía OK)
# 4. Pagar OK → continue provisioned → draft cleared (reentrar /signup vacío o sin draft viejo)
```

---

## Git / PR

```bash
git fetch origin
git checkout fix/signup-form-draft-persist
# si la rama nació antes del merge #42:
git rebase origin/feat/saas-mp-subscriptions   # o origin/fix/signup-checkout-network-error

# SOLO archivos del fix — nunca marketing/flyer/next.config stash del humano
git add modules/signup/public/… tests/… _bmad-output/… docs/handoffs/PROMPT-fix-signup-form-draft-persist.md
git commit -m "$(cat <<'EOF'
fix(signup): persist draft so checkout round-trip keeps form fields

sessionStorage draft (no long-lived password); restore on /signup;
clear when provisioned.
EOF
)"
git push -u origin HEAD

gh pr create --base feat/saas-mp-subscriptions --head fix/signup-form-draft-persist \
  --title "fix(signup): keep form draft across checkout navigation" \
  --body "## Root cause
Form state only in useState; location.assign to checkout drops the page. No sessionStorage draft.

## Fix
- signup-draft helper + form restore/save
- clear on provisioned
- tests

## Verify
- unit draft + browser: fill → Continuar → Back → fields restored (password empty OK)
"
```

---

## Anti-pitfalls

1. **No** “fix” inventando que el checkout falla — medir `curl` 200 primero.  
2. **No** mezclar con turbopack.root / `next.config` (stash local del humano).  
3. Dual Next :3000/:3001 → `fuser` + un solo `bun run dev` (skill nextjs).  
4. Postgres :5432 compose vs :54322 CLI — alinear `DATABASE_URL`.  
5. Password en `localStorage` sin TTL = rechazo en review.  
6. Hydration mismatch si SSR lee storage — client-only restore.  
7. PR base **saas**, no `main`.  
8. Cuenta GH: repo `Estudio-Nomade/tumo-app`.

---

## Entrega peer

- Branch + commit(s) conventional  
- PR URL  
- Root cause 3–5 líneas  
- Qué se eligió para password  
- Smoke steps corridos (real)  
- Tests green (output real, no inventado)

**DONE cuando:** Back desde fake checkout restaura draft y tests pasan.
