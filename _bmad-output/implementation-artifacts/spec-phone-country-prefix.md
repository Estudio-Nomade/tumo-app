---
title: 'PhoneInput: bandera + prefijo + búsqueda de país'
type: 'feature'
created: '2026-08-05'
status: 'done'
route: 'one-shot'
---

# PhoneInput: bandera + prefijo + búsqueda de país

## Intent

**Problem:** El WhatsApp se cargaba a mano sin país/prefijo claro; fácil equivocarse de código de país.

**Approach:** `shell/ui/phone-input.tsx` con bandera + dial code (Popover + Command shadcn, búsqueda por nombre/prefijo), número nacional formateado, valor E.164; helpers en `lib/countries.ts` (libphonenumber-js). Integrado en registro loyalty y login empleado.

## Suggested Review Order

1. [shell/ui/phone-input.tsx](../../shell/ui/phone-input.tsx)
2. [lib/countries.ts](../../lib/countries.ts)
3. [modules/loyalty/public/registration.tsx](../../modules/loyalty/public/registration.tsx)
4. [shell/auth/login/login-form.tsx](../../shell/auth/login/login-form.tsx)
5. [tests/ui/phone-input.test.tsx](../../tests/ui/phone-input.test.tsx)
