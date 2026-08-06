---
title: 'Owner dashboard hub + loyalty operar/observar'
type: 'feature'
created: '2026-08-06'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'dc31c58'
context:
  - '{project-root}/docs/superpowers/specs/2026-08-06-owner-dashboard-loyalty-ia-design.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El Panel del dueño se etiqueta como “Fidelización” y mezcla métricas con el home; dentro de `/loyalty` las insights empujan la operación (buscar, +compra, canjear) fuera del fold. Dueños 50–70 no entienden ni llegan rápido a la tarea.

**Approach:** Hub del comercio con tarjeta de módulo (Sol B): copy “Programa de premios”, CTAs “Atender clientes” y “Cómo va el programa”. `/loyalty` solo opera. Insights viven en `/loyalty/numeros` con acceso por botón “Cómo va” en el header del panel.

## Boundaries & Constraints

**Always:**
- UI dueño/empleado: nunca la palabra “Fidelización” en hub ni loyalty pages (el `Module.name` interno puede seguir siendo Fidelización en registry/tests de módulo).
- `/loyalty` no monta GoalCard, LoyaltyMetrics, TopCustomers, TopByPrizesList ni `LoyaltyModuleInsights`.
- `/loyalty/numeros` reusa `LoyaltyModuleInsights` (o equivalente) + “Volver a clientes” + CTA “Atender clientes”.
- Empleado y dueño: ambos pueden abrir `/numeros` en lectura; `/programa` sigue solo dueño.
- Empty hub 0 clientes: CTA primario “Mostrar el QR” → `/loyalty/qr`; secundario “Atender clientes”.
- TDD: tests fallan primero; actualizar `tests/ui/dashboard-home.test.tsx` y tests de panel según corresponda.
- Labels KPI / body esencial ≥16px en MetricCard y saludo shell donde se toque.

**Ask First:**
- Cambiar bottom nav global o roles de empleado más allá de lectura en `/numeros`.
- Renombrar `loyaltyModule.name` en el registry (rompe tests de nombre de módulo).

**Never:**
- Trends % inventados sin API.
- Métricas embebidas de nuevo bajo el panel operativo.
- Refactor multi-módulo genérico fuera de loyalty home-section + rutas.
- Solución 3 como hub del comercio.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Hub con datos | metrics + weekly + readyCount>0 | Tarjeta “Programa de premios”, líneas de vistazo, CTAs Atender + Cómo va | N/A |
| Hub 0 clientes | customers=0 | Primario “Mostrar el QR”; sin fingir listos | N/A |
| Loyalty page | GET /loyalty | Solo LoyaltyPanel; sin insights ni hr divisor de métricas | Auth igual que hoy |
| Números page | GET /loyalty/numeros | Insights + Volver a clientes → /loyalty | Session inválida → login |
| Panel header | owner/employee | Links “Cómo va” → numeros, QR → /loyalty/qr | N/A |
| Listos | algún canRedeem | Bloque “Listos para canjear” antes del resto de la lista | N/A |
| highlight | ?highlight=id | Comportamiento actual (tope + scroll) | id desconocido: lista normal |

</frozen-after-approval>

## Code Map

- `modules/loyalty/dashboard/home-section.tsx` — reescribir tarjeta hub
- `modules/loyalty/dashboard/module-insights.tsx` — reusar en /numeros
- `app/(dashboard)/[slug]/dashboard/loyalty/page.tsx` — quitar insights
- `app/(dashboard)/[slug]/dashboard/loyalty/numeros/page.tsx` — **nueva**
- `modules/loyalty/dashboard/panel.tsx` — header Cómo va + QR; listos arriba; type scale buscador
- `shell/ui/MetricCard.tsx` — label ≥16px
- `shell/dashboard/dashboard-home.tsx` — saludo ≥16px / contraste
- `modules/loyalty/api/metrics.ts` — datos; opcional count ready vía getTopCustomers
- `tests/ui/dashboard-home.test.tsx` — expectativas hub / loyalty / numeros
- `tests/ui/loyalty-panel.test.tsx` — header / orden listos si aplica

## Tasks & Acceptance

**Execution:**
- [x] `tests/ui/dashboard-home.test.tsx` — RED: hub sin “Fidelización”/Abrir Fidelización; CTAs Atender + Cómo va; loyalty page sin insights; existe ruta numeros con insights; panel header links
- [x] `modules/loyalty/dashboard/home-section.tsx` — tarjeta Programa de premios + vistazo + CTAs (empty QR)
- [x] `app/.../loyalty/page.tsx` — solo panel
- [x] `app/.../loyalty/numeros/page.tsx` — auth + insights + volver + CTA atender
- [x] `modules/loyalty/dashboard/panel.tsx` — header Cómo va/QR; sección listos; a11y mínima buscador/subtítulo
- [x] `shell/ui/MetricCard.tsx` + `shell/dashboard/dashboard-home.tsx` — type scale labels/saludo
- [x] GREEN: `bun test` relevante; lint si aplica


**Acceptance Criteria:**
- Given dueño en hub, when ve la tarjeta loyalty, then copy “Programa de premios”, “Atender clientes” → `/loyalty`, “Cómo va el programa” → `/loyalty/numeros`, and no “Fidelización”.
- Given GET `/loyalty`, when render, then no ModuleInsights/GoalCard/metrics lists on that page.
- Given GET `/loyalty/numeros` con sesión válida, when render, then KPIs+Goal+tops and link back to clientes.
- Given panel con clientes canRedeem, when lista, then bloque listos aparece antes que el resto.
- Given MetricCard label, when render, then font-size class ≥ text-base / 16px.

## Spec Change Log

## Design Notes

Hub card sketch (server component):

```tsx
<section className="rounded-2xl border ... p-4 flex flex-col gap-3">
  <h2>Programa de premios</h2>
  {/* 2–3 líneas vistazo */}
  <a href={`/${slug}/dashboard/loyalty`}>Atender clientes</a>
  <a href={`/${slug}/dashboard/loyalty/numeros`}>Cómo va el programa</a>
</section>
```

Listos en panel: `const ready = customers.filter(c => c.canRedeem)` rendered above main list when `!query` or always on top of `visible` filtered set.

## Verification

**Commands:**
- `bun test tests/ui/dashboard-home.test.tsx` — expected: all pass
- `bun test tests/ui/loyalty-panel.test.tsx` — expected: all pass
- `bun test` — expected: suite green (no regressions modules name Fidelización interno)

**Manual checks:**
- Owner: hub → Atender → buscar sin scrollear métricas; Cómo va → números → Volver

## Suggested Review Order

**Hub del comercio (Sol B)**

- Tarjeta “Programa de premios” + CTAs; empty → QR primero
  [`home-section.tsx:37`](../../modules/loyalty/dashboard/home-section.tsx#L37)

**Operar ≠ observar**

- `/loyalty` solo panel, sin insights
  [`loyalty/page.tsx:28`](../../app/(dashboard)/[slug]/dashboard/loyalty/page.tsx#L28)

- Nueva ruta de métricas + Volver + Atender
  [`numeros/page.tsx:25`](../../app/(dashboard)/[slug]/dashboard/loyalty/numeros/page.tsx#L25)

**Panel operativo**

- Header Cómo va + QR; buscador sticky
  [`panel.tsx:348`](../../modules/loyalty/dashboard/panel.tsx#L348)

- Bloque “Listos para canjear” antes del resto
  [`panel.tsx:523`](../../modules/loyalty/dashboard/panel.tsx#L523)

**A11y type scale**

- Labels KPI ≥16px
  [`MetricCard.tsx:48`](../../shell/ui/MetricCard.tsx#L48)

- Saludo del shell ≥16px
  [`dashboard-home.tsx:22`](../../shell/dashboard/dashboard-home.tsx#L22)

**Tests**

- Expectativas hub / operate-observe
  [`dashboard-home.test.tsx:70`](../../tests/ui/dashboard-home.test.tsx#L70)
