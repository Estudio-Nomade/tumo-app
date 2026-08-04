---
title: 'Verify OTP visual refactor (login shell)'
type: 'refactor'
created: '2026-08-04'
status: 'done'
route: 'one-shot'
---

# Verify OTP visual refactor (login shell)

## Intent

**Problem:** La pantalla de verificación OTP funciona, pero no matchea el shell visual del login (gradiente brand, jerarquía, mobile 375px).

**Approach:** Refactor solo de CSS/estructura en `verify-form.tsx` (+ wiring mínimo de `verify/page.tsx`), reutilizando el mismo fullscreen gradient y patrones del login, sin tocar fetch/API/lógica OTP.

## Suggested Review Order

1. [verify-form.tsx](../../shell/auth/login/verify-form.tsx) — shell, OTP, timer/resend, error/shake, Volver
2. [verify/page.tsx](../../app/(public)/[slug]/login/verify/page.tsx) — Suspense fallback alineado al shell
3. [login-form.tsx](../../shell/auth/login/login-form.tsx) — referencia de consistencia visual
