---
title: 'Login visual refactor (Pencil mockup)'
type: 'refactor'
created: '2026-08-04'
status: 'done'
route: 'one-shot'
---

# Login visual refactor (Pencil mockup)

## Intent

**Problem:** La pantalla de login funciona, pero visualmente no matchea los mockups de Pencil (empleado/login).

**Approach:** Refactor solo de CSS/estructura en `shell/auth/login/login-form.tsx`, usando branding de `useBusiness()` y tokens `--color-primary`, sin tocar fetch/API.

## Suggested Review Order

1. [login-form.tsx](../../shell/auth/login/login-form.tsx) — layout fullscreen, branding, input/button, estados de error
2. [ui-example.pen · Empleado Login](../../../design/ui-example.pen) — referencia visual Pencil (`ts7NR`)
