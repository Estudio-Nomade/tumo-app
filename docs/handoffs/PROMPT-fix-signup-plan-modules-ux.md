# PROMPT — UX signup: plan + selector de módulos (mismo stack landing)

**Modo:** implement (TDD + BMAD rules del repo)  
**Repo:** `/home/marti/Documentos/Estudio Nomade/Tumo`  
**Package:** `tumo-app` (bun + Next 16)  
**Branch base:** `feat/saas-mp-subscriptions` (o `main` si ya mergeó; **re-check** `git status` / `git log`)  
**Nueva branch:** `fix/signup-plan-modules-ux` desde la base actual del SaaS/signup  
**Remote GH:** `Estudio-Nomade/tumo-app` (no Tubi)

---

## Síntoma (palabras del humano)

> El panel cuando el cliente quiere comprar un módulo se ve bastante choto. La lista para elegir el módulo también es bastante chota.  
> Seguir con el **mismo stack** (landing dark + violeta Tumo).

Contexto: self-serve `/signup?plan=` (no el admin platform `/admin`, no el dashboard del tenant). Es el form de **alta + pago** post-CTA “Quiero Básico/Pro/Full”.

---

## Acceptance (browser + tests)

1. `/signup` y `/signup?plan=pro` se ven **alineados a la landing** (negro `#0A0A0A` / `#000`, frames `rounded-[24px]`, borde `#262626`, acento `#7754E3` / `#7527E3`, tipografía landing, kicker mono si aplica).
2. **Plan:** no un `<select>` nativo pelado. Cards o segmented control tipo pricing landing (Básico / Pro destacado / Full) con precio USD/mes y cupo. Tap cambia plan y **reajusta módulos** según cupo (misma lógica actual).
3. **Módulos:** no checkboxes crudos. Cards seleccionables (tap whole card), estado selected visible (borde violeta / fill sutil), icono o badge, título + **descripción corta** (reusar copy de `TOOLS` en `modules/landing/config.ts` o registry). Hit target ≥48px (elderly-ish).
4. Cupo:
   - `basico` → exactamente 1 módulo (elegir uno reemplaza al anterior).
   - `pro` → hasta 3.
   - `full` → los 3 locked selected (no se pueden sacar); copy claro “incluido en Full”.
5. Contador visible: “Elegiste N de M” / “Cupo completo”.
6. Form datos (local, nombre, email, pass) sigue usable mobile `max-w-md` o layout 1 col mobile / opcional 2 col desktop sin romper mobile-first.
7. CTA primary pill `min-h-[52px]` violeta; copy **no diga “cobro demo local (fake MP)”** si el provider puede ser real — texto neutro (“Continuar al pago” / “Vas a pagar con Mercado Pago”).
8. **API/contrato sin cambios de negocio:** sigue `POST /api/signup/checkout` con `{ email, password, businessName, payerName, planId, moduleIds }`. No tocar MP adapter, webhook, provision, schema.
9. Tests: unit/UI del form (cupo toggle, full locked, plan change resets selection) + smoke visual localhost.
10. `bun test` scoped green + `bunx eslint` archivos tocados. No mass-fix lint global.

---

## Stack / look SoT (leer, no reinventar)

| Pieza | Path |
|-------|------|
| Form actual (feo) | `modules/signup/public/signup-form.tsx` |
| Continue post-pago | `modules/signup/public/continue-client.tsx` |
| Pages | `app/signup/page.tsx`, `app/signup/continue/page.tsx` |
| Pricing landing (cards) | `modules/landing/sections/pricing.tsx` |
| Tools copy módulos | `modules/landing/config.ts` → `TOOLS`, `PLANS` |
| Botones landing | `modules/landing/ui/button.tsx` |
| Catálogo cupo | `shell/billing/plan-catalog.ts` (`PLAN_CATALOG`, `isValidModuleSelection`) |
| Flags | `modules/signup/lib/flags.ts` |
| Registry módulos | `lib/modules.ts` + `modules/{loyalty,orders,turnos}` (`name`/`icon` si sirve) |
| shadcn | `components/ui/*` — preferir si hace falta; **no** reinventar dialog/select pesado si card-tap alcanza |
| Tokens | landing craft: `#7754E3`, `#5B35C9`, `#C4B5FD`, `#A3A3A3`, grid bg classes ya en landing |

**Mismo stack =** Next + Tailwind + componentes landing/signup existentes + shadcn si suma. **No** Meterial nuevo, no Bootstrap, no CSS modules paralelos, no framer obligatorio.

---

## Arquitectura (no romper)

```
app/signup → SignupForm (client)
  → POST /api/signup/checkout → postSignupCheckout → startCheckout → PaymentProvider
```

- UI-only (+ tests UI).  
- Validación cupo **ya** en server (`createCheckoutSessionInput` / plan-catalog). Client debe respetar la misma regla para no spamear 400.  
- No importar `modules/orders|loyalty|turnos` domain en signup (AUDITORIA: no cross-module). Copy/icons desde landing config o strings locales en signup.  
- BMAD + **TDD**: test que falle primero (toggle cupo / full locked / plan cards render) → UI.  
- Conventional commits; **no** `git add -A` (hay marketing/flyer untracked ajenos).

---

## Hipótesis de “por qué se ve choto” (confirmadas en código)

1. Form dark genérico con `<select>` nativo + checkboxes — cero parity con cards de `PricingSection`.  
2. Módulos = solo label “Fidelización/Pedidos/Turnos” sin descripción ni estado visual de card.  
3. Copy residual “cobro demo local (fake MP)” en el subtítulo.  
4. Sin jerarquía plan destacado (Pro) como en landing.

---

## Alcance explícito

### IN
- Rediseño visual + interacción de plan + módulos en `signup-form.tsx` (y subcomponentes en `modules/signup/public/` si extrae).  
- Tests `tests/ui/signup-*.test.tsx` y/o ampliar flags/checkout si hace falta solo por copy/selectors.  
- Opcional polish mínimo de `continue-client.tsx` para no romper la sensación de misma familia visual (si está igual de crudo).

### OUT
- Cambiar precios/cupo/backend MP/webhook/provision.  
- Owner login email post-pago.  
- Admin platform billing UI.  
- Landing pricing (salvo reexport de constantes compartidas KISS).  
- Pencil-only phase (humano pidió fix UI en app).  
- Activar módulos en carri / seed.  
- Commit de `docs/marketing/*`, flyers, `.env*`.

---

## Implement notes (KISS)

1. Extraer `MODULE_OPTIONS` desde `TOOLS` (id/title/description) filtrando solo `loyalty|orders|turnos` — una SoT de copy.  
2. Plan picker: map `PLAN_CATALOG` o `PLANS` a 3 cards; `highlighted` en Pro.  
3. Module picker: button/card `aria-pressed` en vez de checkbox invisible; checkbox sr-only OK si accesibilidad.  
4. Mantener `min-h-[48px]` / CTA 52px.  
5. Mobile-first; no desktop-only grid que rompa el form.  
6. Si usás shadcn: `npx shadcn@latest add …` solo si hace falta; preferir HTML+Tailwind al estilo landing.

---

## Verify

```bash
export PATH="$HOME/.bun/bin:$PATH"
cd "/home/marti/Documentos/Estudio Nomade/Tumo"
git checkout -b fix/signup-plan-modules-ux   # desde base con signup
bun test tests/ui/signup-form.test.tsx tests/signup-flags.test.ts tests/signup-checkout-api.test.ts  # + los que crees
bunx eslint modules/signup/public/**/*.tsx app/signup/**/*.tsx
bun run dev
# browser: http://localhost:3000/signup?plan=basico
#          http://localhost:3000/signup?plan=pro
#          http://localhost:3000/signup?plan=full
# Hard refresh. Probar toggle cupo y Full locked.
```

Smoke: basico solo 1 selected; pro hasta 3; full 3 disabled-on; Continuar sigue POST OK (fake o mp según env — no es scope de este PR).

---

## Git / PR

- Un commit lógico: `fix(signup): plan cards + module picker UX`  
- Stage **solo** archivos signup/tests/docs de este fix.  
- PR a `feat/saas-mp-subscriptions` **o** `main` según dónde viva signup (si signup solo está en la feat branch, PR hacia esa feat o merge chain — **no** inventar que está en main sin `git log`).  
- Summary PR 3–5 líneas: root cause (select+checkbox crudo) + cards landing-parity + cupo UX.

---

## Anti-scope / pitfalls Tumo

- Skill: `tumo-dev-pitfalls` (SaaS signup, CTA force-dynamic, fake vs MP).  
- No confudir este UI con **admin** “activar módulo” en `/admin/businesses`.  
- No reintroducir dLocal copy.  
- `BILLING_PROVIDER` / ngrok / MP tokens = ops humano; no hardcode URLs ngrok.  
- Turbopack: si `/` 500, `next.config.ts` ya puede tener `turbopack.root` en WIP — no revertir sin causa.  
- Bun PATH en Kali.

---

## Done cuando

- [ ] UI plan + módulos no se ve “form HTML 2005”  
- [ ] Parity visual landing  
- [ ] Cupo correcto en client  
- [ ] Tests nuevos/actualizados green  
- [ ] Browser smoke 3 planes  
- [ ] Commit/PR scoped  

**No** digas “listo” solo con Jest: hard refresh en mobile width (~390px) obligatorio.
