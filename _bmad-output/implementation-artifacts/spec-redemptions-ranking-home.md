---
title: 'Ranking de canjes en Panel dueño (Fidelización)'
type: 'feature'
created: '2026-08-05'
status: 'done'
baseline_commit: 'fdba74e'
review_loop_iteration: 0
context:
  - '{project-root}/docs/superpowers/specs/2026-08-05-redemptions-ranking-and-module-home-design.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** En la sección Fidelización del Panel el dueño solo ve un ranking de progreso de compras (“Top clientes”). No ve cuántos clientes distintos canjearon ni un ranking por premios ganados.

**Approach:** Agregar handlers DI de conteo/ranking all-time sobre `redemptions` y mostrar dos listas en `LoyaltyHomeSection`: A) más cerca del premio (progreso existente) y B) más premios ganados + header “N clientes canjearon”.

## Boundaries & Constraints

**Always:**
- TDD: test que falla → código mínimo → verde.
- Handlers DI en `metrics.ts`; server component llama DI (sin HTTP nuevo).
- Ranking premios e historial de canjeadores = **all-time** (sin ventana temporal).
- Filas clickeables → `/{slug}/dashboard/loyalty?highlight={id}`.
- KPIs sin trends inventados; GoalCard sin ETA inventada.
- Home = lectura (sin CTAs Atender / Mostrar QR).
- Código en inglés; copy UI en español.

**Ask First:**
- Cambiar el `ORDER BY` de `getTopCustomers` si rompe tests existentes.
- Endpoints HTTP nuevos o cambios de schema.

**Never:**
- Selector Semana/Mes/Total.
- Extraer Customer a core.
- Rehacer multi-module home, settings shell, panel ops, QR, redeem dialog.
- Inventar trends/ETA.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Conteo con canjes | `redemptions` con N customer_id distintos | `countCustomersWithRedemptions` → N | N/A |
| Conteo vacío | 0 filas redemptions | → 0 | N/A |
| Ranking premios | varios canjes por cliente | top por prizes DESC, last_redeemed_at DESC, name ASC; limit 3–5 | N/A |
| Ranking vacío | 0 canjes | `[]` | N/A |
| UI lista B con datos | rows + redeemersCount=N | título “Más premios ganados”, “N clientes canjearon”, filas “K premios”, href highlight | N/A |
| UI lista B vacía | [] + 0 | “0 clientes canjearon” + “Todavía nadie canjeó un premio.” | N/A |
| UI lista A | top progreso | título “Más cerca del premio”, badges En curso/Listo, Ver todos | vacío: copy que empuje a mostrar QR del módulo |
| Home wire | Promise.all 5 fuentes | metrics + GoalCard + lista A + lista B; sin QuickActions | N/A |

</frozen-after-approval>

## Code Map

- `modules/loyalty/api/metrics.ts` — agregar `countCustomersWithRedemptions`, `getTopCustomersByPrizes`, tipo `TopCustomerByPrizesRow`; mantener `getTopCustomers` (ORDER BY purchases DESC = ratio cuando needed es constante de negocio).
- `modules/loyalty/dashboard/widgets.tsx` — especializar lista A (título “Más cerca del premio”; vacío QR-módulo) y nueva `TopByPrizesList` (lista B).
- `modules/loyalty/dashboard/home-section.tsx` — wire Promise.all + render A+B.
- `tests/loyalty-metrics.test.ts` — tests DI nuevos.
- `tests/ui/dashboard-home.test.tsx` — source/render guards listas A/B, empty B, no CTAs ops.

## Tasks & Acceptance

**Execution:**
- [x] `tests/loyalty-metrics.test.ts` -- RED tests `countCustomersWithRedemptions` + `getTopCustomersByPrizes` (mock sql DI) -- prueba contrato
- [x] `modules/loyalty/api/metrics.ts` -- GREEN handlers + tipo -- SQL all-time del design
- [x] `tests/ui/dashboard-home.test.tsx` -- RED UI: títulos A/B, “clientes canjearon”, empty B, highlight href, home-section wire, sin CTAs ops -- regresión
- [x] `modules/loyalty/dashboard/widgets.tsx` -- GREEN listas A/B -- copy y filas
- [x] `modules/loyalty/dashboard/home-section.tsx` -- GREEN Promise.all + render -- panel dueño
- [x] Verificar I/O matrix con `bun test` + `bun run build`

**Acceptance Criteria:**
- Given canjes en `redemptions`, when el dueño abre Panel, then ve “Más premios ganados” ordenado por premios y header “N clientes canjearon” con N = DISTINCT redeemers all-time.
- Given clientes con progreso, when abre Panel, then ve “Más cerca del premio” separada.
- Given 0 canjes, when abre Panel, then lista B vacía con copy acordado y N=0.
- Given click en fila de A o B, when navega, then llega a `/loyalty?highlight={id}`.
- Given `bun test` y `bun run build`, when corren, then pasan.

## Spec Change Log

## Design Notes

`getTopCustomers` ya ordena `purchases DESC` con `purchases_needed` constante por negocio → ratio equivalente. No tocar ORDER BY salvo que un test lo exija.

Lista A: renombrar título de `TopCustomers` a “Más cerca del premio” (prop o componente); vacío: empujar a QR del módulo (no settings).

Lista B header: `{N} clientes canjearon`; fila: `{prizes} premios` (+ opcional last redeem muted).

```ts
export type TopCustomerByPrizesRow = {
  id: string
  name: string
  prizes: number
  lastRedeemedAt: number | null // ms epoch
}
```

## Verification

**Commands:**
- `bun test` -- expected: all pass
- `bun run build` -- expected: success

## Suggested Review Order

**Home wire (entry)**

- Panel Fidelización carga métricas, meta y ambos rankings en paralelo
  [`home-section.tsx:24`](../../modules/loyalty/dashboard/home-section.tsx#L24)

- Render lista A + lista B sin CTAs operativos
  [`home-section.tsx:60`](../../modules/loyalty/dashboard/home-section.tsx#L60)

**Handlers DI (datos all-time)**

- COUNT DISTINCT canjeadores históricos
  [`metrics.ts:163`](../../modules/loyalty/api/metrics.ts#L163)

- Ranking por premios + lastRedeemedAt ms
  [`metrics.ts:185`](../../modules/loyalty/api/metrics.ts#L185)

**UI listas**

- Lista A renombrada “Más cerca del premio” + highlight
  [`widgets.tsx:187`](../../modules/loyalty/dashboard/widgets.tsx#L187)

- Lista B header N canjeadores + filas premios + empty
  [`widgets.tsx:260`](../../modules/loyalty/dashboard/widgets.tsx#L260)

**Tests**

- DI mocks conteo y ranking
  [`loyalty-metrics.test.ts:191`](../../tests/loyalty-metrics.test.ts#L191)

- Render guards A/B + wire home-section
  [`dashboard-home.test.tsx:93`](../../tests/ui/dashboard-home.test.tsx#L93)
