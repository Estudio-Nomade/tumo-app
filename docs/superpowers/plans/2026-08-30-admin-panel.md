# Admin Panel Interno — Implementation Plan

> **For agentic workers:** Execute task-by-task with TDD. Checkboxes track progress.

**Goal:** Internal Tumo staff panel at `/admin` to list all businesses, toggle modules, and mark billing manually.

**Architecture:** Pseudo-module `modules/admin` (not in tenant registry) with pure `(deps,input)=>JsonResult` APIs; thin `app/admin` + `app/api/admin`; separate cookie `admin_session_token` + tables; billing 1:1 + payments ledger.

**Tech Stack:** Next 16 App Router, Bun, Postgres, shadcn Dialog, Authyo OTP.

## Global Constraints

- Cookie **must** be `admin_session_token` (never reuse `session_token`)
- Admin **not** in `lib/modules.ts` registry
- No cross-module imports from orders/loyalty/turnos
- Money INT cents; statuses `al_dia|pendiente|vencido`
- BMAD + TDD; verify `bun test` / lint / build
- Commits conventional; PR `feat/admin-panel` → `main`

---

### Task 1: Spec + plan

- [x] Spec `docs/superpowers/specs/2026-08-30-admin-panel-design.md`
- [x] This plan

### Task 2: Migration 010

- [ ] `shell/db/migrations/010_tumo_admin.sql`
- [ ] Register in `shell/db/migrate.ts`
- [ ] Seed billing for carri=`al_dia`, defe=`vencido` if present

### Task 3: Registry helper + types

- [ ] `getRegisteredModuleIds()` in `lib/modules.ts`
- [ ] `modules/admin/lib/types.ts`

### Task 4: Admin auth (TDD)

- [ ] Tests `tests/admin-auth.test.ts`
- [ ] `modules/admin/lib/allowlist.ts`, `session.ts`, `api/auth.ts`

### Task 5: Businesses / metrics / modules / billing (TDD)

- [ ] `tests/admin-businesses.test.ts`, `admin-modules.test.ts`, `admin-billing.test.ts`
- [ ] Domain APIs under `modules/admin/api/`

### Task 6: proxy + HTTP routes

- [ ] Extend `proxy.ts` for `/admin/*`
- [ ] `app/api/admin/**` thin routes
- [ ] Tests `tests/admin-proxy.test.ts` (matcher/path logic pure if extracted)

### Task 7: UI

- [ ] `app/admin/layout.tsx`, `login`, home, businesses list/detail
- [ ] Dashboard components + Dialog toggle

### Task 8: env + auditoría + verify + PR

- [ ] `.env.example` `TUMO_ADMIN_PHONES`, `SKIP_AUTHYO`
- [ ] Update `docs/AUDITORIA-TUMO-ARQUITECTURA.md`
- [ ] `bun test && bun run lint && bun run build`
- [ ] PR

---

## File map

| Path | Role |
|------|------|
| `shell/db/migrations/010_tumo_admin.sql` | Schema |
| `modules/admin/api/*.ts` | Domain |
| `modules/admin/lib/*` | types, session, allowlist, deps |
| `modules/admin/dashboard/*` | Client UI pieces |
| `app/admin/**` | Pages |
| `app/api/admin/**` | HTTP |
| `tests/admin-*.test.ts` | Suite |
