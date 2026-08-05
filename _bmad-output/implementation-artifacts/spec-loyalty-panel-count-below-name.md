---
title: 'Loyalty panel: contador N/M debajo del nombre'
type: 'bugfix'
created: '2026-08-05'
status: 'done'
route: 'one-shot'
---

# Loyalty panel: contador N/M debajo del nombre

## Intent

**Problem:** En el panel empleado de loyalty (`/carri/dashboard/loyalty`), el contador `N/M` iba al lado de la barra en horizontal y en mobile quedaba apretado/ilegible por el botón de acción.

**Approach:** Apilar debajo del nombre: contador `purchases/purchasesNeeded` y barra de progreso a ancho del bloque de texto (`w-full` del `flex-1`).

## Suggested Review Order

1. [panel.tsx — bloque cliente](../../modules/loyalty/dashboard/panel.tsx) — layout name → N/M → barra
2. [loyalty-panel.test.tsx — assertion layout](../../tests/ui/loyalty-panel.test.tsx) — orden y `flex-col` sin `w-[88px]`
