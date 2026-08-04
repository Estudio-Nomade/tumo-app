---
title: 'Dashboard home + sidebar visual refactor'
type: 'refactor'
created: '2026-08-04'
status: 'done'
route: 'one-shot'
---

# Dashboard home + sidebar visual refactor

## Intent

**Problem:** El dashboard home y el sidebar funcionan, pero no matchean los mockups Pencil (métricas, timeline, nav desktop/mobile).

**Approach:** Refactor visual en `widgets.tsx` y `dashboard-layout.tsx`: tarjetas/timeline al estilo Actividad, sidebar 240px `#F9FAFB` en desktop y tabs inferiores en mobile, sin tocar fetch/métricas.

## Suggested Review Order

1. [dashboard-layout.tsx](../../shell/layouts/dashboard-layout.tsx) — sidebar desktop, header mobile, tabs, Salir
2. [widgets.tsx](../../modules/loyalty/dashboard/widgets.tsx) — DashboardHome, métricas, timeline, empty state
3. [MetricCard.tsx](../../shell/ui/MetricCard.tsx) — base visual de tarjetas (sin cambios)
