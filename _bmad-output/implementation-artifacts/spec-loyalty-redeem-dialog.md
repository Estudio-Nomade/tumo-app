---
title: 'Loyalty panel: diálogo de confirmación de canje'
type: 'bugfix'
created: '2026-08-05'
status: 'done'
route: 'one-shot'
---

# Loyalty panel: diálogo de confirmación de canje

## Intent

**Problem:** Al canjear un premio, el navegador mostraba un `window.confirm` nativo feo (“localhost:3000 dice…”).

**Approach:** Reemplazar por un `Dialog` shadcn brandado (título, premio/cliente, Cancelar / Sí canjear), con error in-dialog y guard anti double-submit.

## Suggested Review Order

1. [panel.tsx — Dialog canje](../../modules/loyalty/dashboard/panel.tsx) — estado `redeemTarget`, `confirmRedeem`, UI
2. [loyalty-panel.test.tsx](../../tests/ui/loyalty-panel.test.tsx) — sin `window.confirm`, usa Dialog
