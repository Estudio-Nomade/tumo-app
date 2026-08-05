---
title: 'DatePicker shadcn para cumpleaños + política AGENTS'
type: 'feature'
created: '2026-08-05'
status: 'done'
route: 'one-shot'
---

# DatePicker shadcn para cumpleaños + política AGENTS

## Intent

**Problem:** El `input type=date` nativo en registro loyalty tiene UX pobre; además los agentes tendían a reinventar pickers complejos.

**Approach:** Instalar shadcn (Calendar + Popover), componer `shell/ui/date-picker.tsx`, usarlo en el registro, y documentar en `AGENTS.md` preferir shadcn para primitives de interacción pesada.

## Suggested Review Order

1. [shell/ui/date-picker.tsx](../../shell/ui/date-picker.tsx) — composición Calendar + Popover
2. [modules/loyalty/public/registration.tsx](../../modules/loyalty/public/registration.tsx) — integración + validación
3. [AGENTS.md](../../AGENTS.md) — política shadcn
4. [app/globals.css](../../app/globals.css) — tokens shadcn + primary brand
5. [tests/ui/registration-birthday.test.tsx](../../tests/ui/registration-birthday.test.tsx) — contrato
