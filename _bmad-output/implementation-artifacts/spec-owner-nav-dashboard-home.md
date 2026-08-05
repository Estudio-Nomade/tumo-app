---
title: 'Nav Dueño + Dashboard Home (Pencil)'
type: 'refactor'
created: '2026-08-04'
status: 'done'
review_loop_iteration: 0
baseline_commit: '2c693bd'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El nav inferior del dueño sigue basado en módulos (Fidelización) y el home del Panel no incluye saludo personalizado, meta semanal ni top clientes del mockup Pencil (`ljwya` / `wMfUq`).

**Approach:** Nav fijo de 3 tabs (Panel / Actividad / Ajustes) con Lucide; avatar solo identidad; home con métricas+ícono+trend, GoalCard y TopCustomers mock; actividad en ruta propia; settings placeholder.

## Boundaries & Constraints

**Always:**
- Mobile-first 375px, Tailwind, tokens `var(--color-primary)` / `var(--color-secondary)` + paleta Pencil (ink/surface/border).
- TDD: tests fallan primero; `bun test` y `bun run build` verdes al cerrar.
- Owner: bottom nav + desktop sidebar = Panel → `/{slug}/dashboard`, Actividad → `/{slug}/dashboard/activity`, Ajustes → `/{slug}/dashboard/settings`.
- Avatar mobile = identidad (no logout). Logout solo desktop sidebar (botón Salir) o futuro en Ajustes.
- Pasar `employeeName` desde layout (`session.name`) al shell y al saludo del home.
- Mocks de meta/top clientes en español, realistas.
- Empleado (`role !== owner`): sigue yendo a loyalty; nav de módulos o solo Fidelización (no forzar las 3 tabs de dueño si no aplican).

**Ask First:**
- Cambiar fetch/API/auth o esquema de DB.
- Quitar la ruta `/dashboard/loyalty` del owner sin alternativa.

**Never:**
- Tocar lógica de métricas/activity handlers ni auth.
- Usar el avatar como botón de logout en mobile.
- Inventar paquetes si Lucide ya alcanza.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Owner home | session.name = "Nico" | Subtítulo "Hola, Nico. Así va tu comercio hoy." | Si name vacío → "Hola. Así va..." o fallback "Dueño" |
| Owner nav | path `/x/dashboard` | Tab Panel activo (exact) | activity/settings no marcan Panel |
| Owner nav | path `/x/dashboard/activity` | Tab Actividad activo | — |
| MetricCard | icon + trend + variant highlight | Ícono 34×34, badge verde, fondo amarillo | sin icon/trend → layout sin huecos rotos |
| Activity page | events hoy/ayer | Secciones "Hoy"/"Ayer" + filas timeline | vacío → empty state existente |
| Settings | business cargado | Nombre, colores, "Próximamente" | — |
| Mobile avatar | click | No logout | Logout solo Salir desktop |

</frozen-after-approval>

## Code Map

- `shell/layouts/dashboard-layout.tsx` — nav mobile/desktop, header, avatar, logout
- `app/(dashboard)/[slug]/layout.tsx` — pasar `employeeName={session.name}`
- `app/(dashboard)/[slug]/dashboard/page.tsx` — home owner; pasar `employeeName`
- `app/(dashboard)/[slug]/dashboard/activity/page.tsx` — **nuevo** timeline
- `app/(dashboard)/[slug]/dashboard/settings/page.tsx` — **nuevo** placeholder
- `modules/loyalty/dashboard/widgets.tsx` — DashboardHome, GoalCard, TopCustomers; quitar activity del home
- `shell/ui/MetricCard.tsx` — icon, trend, variant
- `lib/modules.ts` — `location?: string` en Business
- `modules/loyalty/index.ts` — icon Lucide `gift` (minúscula) si se usa en UI
- `tests/ui/MetricCard.test.tsx`, `tests/ui/visual-tokens.test.tsx` — extender
- `tests/ui/dashboard-nav.test.tsx` — **nuevo** (nav fijo + no-logout avatar)
- `tests/ui/dashboard-home.test.tsx` — **nuevo** (saludo, goal, top)
- `tests/modules.test.ts` — icon loyalty si cambia

## Tasks & Acceptance

**Execution:**
- [x] `tests/ui/MetricCard.test.tsx` + `shell/ui/MetricCard.tsx` — RED/GREEN: props `icon`, `trend`, `variant` (`default` naranja / `highlight` amarillo); layout ícono+badge / value / label
- [x] `tests/ui/dashboard-nav.test.tsx` + `shell/layouts/dashboard-layout.tsx` — RED/GREEN: owner 3 tabs fijos Lucide (LayoutDashboard, Activity, Settings); pill 62/36/26; avatar no es button logout; header logo sandwich opcional + location; desktop mismos 3 links + Salir
- [x] `app/(dashboard)/[slug]/layout.tsx` — pasar `employeeName={session.name}`
- [x] `lib/modules.ts` — `location?: string`; header usa `business.location` o "Ubicación"/omitir si vacío
- [x] `tests/ui/dashboard-home.test.tsx` + `modules/loyalty/dashboard/widgets.tsx` — RED/GREEN: saludo con nombre; métricas con icon+trend; GoalCard mock 18/25; TopCustomers 2–3 mock; sin sección actividad en home
- [x] `app/(dashboard)/[slug]/dashboard/page.tsx` — pasar `employeeName` a DashboardHome; dejar de requerir activity en home (opcional no fetch activity aquí)
- [x] `app/(dashboard)/[slug]/dashboard/activity/page.tsx` — server: getRecentActivity + título Actividad + timeline agrupado Hoy/Ayer (reutilizar/extraer LoyaltyTimeline)
- [x] `app/(dashboard)/[slug]/dashboard/settings/page.tsx` — placeholder Ajustes (nombre, colores, Próximamente); logout opcional link
- [x] `modules/loyalty/index.ts` + `tests/modules.test.ts` — icon `"gift"` si se actualiza
- [x] `tests/ui/visual-tokens.test.tsx` — guards: tabs fijos Panel/Actividad/Ajustes; GoalCard gradient markers

**Acceptance Criteria:**
- Given owner en mobile, when abre dashboard, then ve 3 tabs Panel/Actividad/Ajustes con labels e íconos Lucide y Panel activo.
- Given owner, when toca avatar, then no cierra sesión.
- Given session.name "Nico", when carga Panel, then saludo personalizado + 3 métricas con ícono/trend + meta semanal + top clientes.
- Given owner, when va a Actividad, then timeline con Hoy/Ayer sin métricas del home.
- Given owner, when va a Ajustes, then ve placeholder con datos del negocio.
- Given empleado, when entra al dashboard, then sigue pudiendo usar Fidelización (redirect/nav actual no se rompe).

## Spec Change Log

## Design Notes

**Nav owner (fijo):**
```ts
const ownerTabs = [
  { href: `/${slug}/dashboard`, label: "Panel", icon: LayoutDashboard, exact: true },
  { href: `/${slug}/dashboard/activity`, label: "Actividad", icon: Activity },
  { href: `/${slug}/dashboard/settings`, label: "Ajustes", icon: Settings },
]
```

**GoalCard mock:** `{ current: 18, target: 25, eta: "sábado" }` — fill width `(current/target)*100%`, mensaje "A este ritmo, cumplís la meta el {eta}."

**TopCustomers mock:** filas con iniciales, progreso textual, CTA "Canjear" o "+1 compra".

**Timeline agrupado:** helper `groupByDay(events)` → "Hoy" | "Ayer" | fecha; hora siempre `HH:mm`.

## Verification

**Commands:**
- `bun test` — expected: all pass
- `bun run build` — expected: success

## Suggested Review Order

**Nav dueño (entry)**

- Tabs fijos Panel/Actividad/Ajustes + Lucide; avatar sin logout
  [`dashboard-layout.tsx:66`](../../shell/layouts/dashboard-layout.tsx#L66)

- Header location opcional + avatar identidad
  [`dashboard-layout.tsx:190`](../../shell/layouts/dashboard-layout.tsx#L190)

**Home Panel**

- Saludo con nombre + métricas + goal + top (sin actividad)
  [`widgets.tsx:287`](../../modules/loyalty/dashboard/widgets.tsx#L287)

- GoalCard gradiente y barra de progreso
  [`widgets.tsx:112`](../../modules/loyalty/dashboard/widgets.tsx#L112)

- MetricCard icon/trend/variant
  [`MetricCard.tsx:12`](../../shell/ui/MetricCard.tsx#L12)

**Rutas nuevas**

- Actividad: fetch + timeline Hoy/Ayer
  [`activity/page.tsx:1`](../../app/(dashboard)/[slug]/dashboard/activity/page.tsx#L1)

- Ajustes placeholder + logout mobile
  [`settings/page.tsx:75`](../../app/(dashboard)/[slug]/dashboard/settings/page.tsx#L75)

**Wiring**

- employeeName desde sesión al layout
  [`layout.tsx:35`](../../app/(dashboard)/[slug]/layout.tsx#L35)

- Business.location opcional
  [`modules.ts:21`](../../lib/modules.ts#L21)

**Tests**

- Nav/home/MetricCard guards
  [`dashboard-nav.test.tsx:1`](../../tests/ui/dashboard-nav.test.tsx#L1)
  [`dashboard-home.test.tsx:1`](../../tests/ui/dashboard-home.test.tsx#L1)
