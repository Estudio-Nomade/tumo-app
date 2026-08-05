# Owner Settings + Programa Edit — Implementation Plan

> **For agentic workers:** Execute task-by-task with TDD. Steps use checkbox syntax.

**Goal:** Dueño edita nombre/colores en Ajustes y N compras + premio en Fidelización/Programa, visible en localhost.

**Architecture:** Handlers con deps (como loyalty APIs) + PATCH routes owner-only + client forms dirty/save/toast + router.refresh para CSS vars.

**Tech Stack:** Next.js App Router, Bun test, postgres, Tailwind, Lucide.

## Global Constraints

- Solo owner; employee 403/redirect
- Validación: name 2–60, hex #RRGGBB, purchases 2–50, reward 2–40
- No editar logo/slug/location
- TDD: test falla primero
- Español UI

---

### Task 1: Validación + update business handler

**Files:**
- Create: `shell/business/update.ts`
- Create: `tests/business-update.test.ts`
- Modify: `shell/db/business.ts` (update fn vía deps)

### Task 2: API PATCH /api/business

**Files:**
- Create: `app/api/business/route.ts`

### Task 3: update program handler + API

**Files:**
- Create: `modules/loyalty/api/program.ts`
- Create: `app/api/loyalty/program/route.ts`
- Create: `tests/loyalty-program-update.test.ts`

### Task 4: Settings form UI

**Files:**
- Create: `shell/ui/settings-form.tsx`
- Modify: `app/(dashboard)/[slug]/dashboard/settings/page.tsx`
- Modify: `tests/ui/dashboard-nav.test.tsx`

### Task 5: Programa page UI

**Files:**
- Create: `modules/loyalty/dashboard/program-form.tsx`
- Create: `app/(dashboard)/[slug]/dashboard/loyalty/programa/page.tsx`
- Link from settings + loyalty panel
- Tests source guards

### Task 6: Verify bun test + dev server
