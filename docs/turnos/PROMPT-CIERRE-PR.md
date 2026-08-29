# PROMPT EJECUTABLE — Cerrar Turnos + rama + push + PR

Decile al agente exactamente:

> Leé y ejecutá **solo** este archivo:  
> `/home/marti/Documentos/Estudio Nomade/Tumo/docs/turnos/PROMPT-CIERRE-PR.md`  
> No pegues el `.pen` ni auditorías largas en el chat.

---

## Repo
- Path: `/home/marti/Documentos/Estudio Nomade/Tumo`
- Remote: `origin` → `https://github.com/Estudio-Nomade/tumo-app.git`
- Base PR: **`main`**
- Rama de trabajo: **`feat/turnos-module`** (YA existe localmente; NO crear otra rama con otro nombre salvo que `feat/turnos-module` no exista)
- Bun: `export PATH="$HOME/.bun/bin:$PATH"`

## Estado git al armar este prompt (re-chequear vos)

```text
Branch: feat/turnos-module
Commits ya en la rama (sobre main):
  3d9f456 feat(turnos): register module + design docs
  5e9c97d feat(turnos): add 009_turnos migration

Mucho trabajo UNTRACKED / modificado sin commit:
  modules/turnos/** (api, lib, public, dashboard extra)
  app/api/turnos/**
  app/(public)/[slug]/turnos/**
  app/(dashboard)/[slug]/dashboard/turnos/**
  tests/turnos-*.test.ts (varios)
  shell/db/seed.ts (mod)
  docs/turnos/, docs/AUDITORIA-... (si aporta, incluir)
  plan/spec turnos
NO commitear:
  design-artifacts/*.pen.bak*
  .env.local / secrets
  node_modules / .next
  basura local
```

## Objetivo
1. Terminar lo que falta del módulo Turnos (Task 11 + gaps).
2. Verify verde.
3. Commits limpios en `feat/turnos-module`.
4. `git push -u origin feat/turnos-module`.
5. Abrir PR a `main` con `gh pr create`.

---

## Parte A — Qué falta (hacer antes del commit final)

Seguí `docs/superpowers/plans/2026-08-29-turnos-module.md` y `docs/superpowers/specs/2026-08-29-turnos-module-design.md`.  
Wiring admin = igual loyalty/orders (`lib/modules.ts`, HomeSection, activity, hub, shell settings solo marca).

### Checklist gaps
- [ ] Inventariar untracked turnos y confirmar que no falte archivo referenciado por imports
- [ ] `bun test tests/turnos-*.test.ts` y `bun test` — arreglar falls con TDD
- [ ] `bun run lint` y `bun run build` — arreglar errores de Turnos (no refactors ajenos)
- [ ] Hub módulos: iconos `gift` / `receipt` / `calendar` en `app/(dashboard)/[slug]/dashboard/modules/page.tsx` si siguen rotos
- [ ] Seed: `active_modules` incluye `turnos` (`shell/db/seed.ts`); seed demo servicios/settings si el spec lo pide y aún no está
- [ ] UI smoke opcional: `tests/ui/turnos-*.test.tsx` solo si el repo ya testea UI similar y es barato; si no, documentar deuda
- [ ] Opcional deuda (no bloquea PR): brand preview turnos en `client-brand-preview-registry.ts`
- [ ] Marcar Task 11 del plan como `[x]` cuando verify pase
- [ ] Nunca importar `modules/orders` o `modules/loyalty` desde turnos
- [ ] No MercadoPago en turnos; no editor de marca dentro de turnos

### Verify (obligatorio, output real)
```bash
export PATH="$HOME/.bun/bin:$PATH"
cd "/home/marti/Documentos/Estudio Nomade/Tumo"
bun test tests/turnos-*.test.ts
bun test
bun run lint
bun run build
```

---

## Parte B — Git (reglas del repo)

### Reglas
- Conventional commits: `feat(turnos): …` / `fix(turnos): …` / `docs(turnos): …` / `test(turnos): …`
- **Nunca** `git add -A` ni `git add .`
- **Nunca** `--no-verify`, force-push a `main`, amend de commits ya pusheados sin pedir
- Stage **archivo por archivo** o paths explícitos de turnos
- Excluir siempre: `*.pen.bak*`, `.env*`, credenciales, lockfiles no pedidos

### 1) Alinear rama con main
```bash
git fetch origin main
git checkout feat/turnos-module
# si la rama no existe: git checkout -b feat/turnos-module origin/main
git merge origin/main   # o rebase si preferís y no hay push conflictivo; si ya hay push, merge es más seguro
# resolver conflictos si hay; re-correr verify
```

### 2) Commits lógicos (ejemplo de partición — adaptá al diff real)

**Commit 1 — dominio API + lib + tests**
```bash
git add \
  modules/turnos/api \
  modules/turnos/lib \
  modules/turnos/index.ts \
  modules/turnos/dashboard/home-section.tsx \
  modules/turnos/README.md \
  tests/turnos-availability.test.ts \
  tests/turnos-bookings.test.ts \
  tests/turnos-metrics.test.ts \
  tests/turnos-payments.test.ts \
  tests/turnos-services.test.ts \
  tests/turnos-settings.test.ts
# solo si existen y son de turnos:
# tests/turnos-module.test.ts tests/turnos-migration.test.ts ya pueden estar commiteados

git status   # revisar que no se coló basura
git commit -m "$(cat <<'EOF'
feat(turnos): domain APIs, availability and unit tests

Co-Authored-By: <modelo-que-uses> <noreply@agente>
EOF
)"
```

**Commit 2 — HTTP adapters + pages**
```bash
git add \
  app/api/turnos \
  "app/(public)/[slug]/turnos" \
  "app/(dashboard)/[slug]/dashboard/turnos" \
  modules/turnos/public \
  modules/turnos/dashboard/panel.tsx \
  modules/turnos/dashboard/services-manager.tsx \
  modules/turnos/dashboard/settings-form.tsx
git commit -m "$(cat <<'EOF'
feat(turnos): public booking flow and dashboard panel

EOF
)"
```

**Commit 3 — seed + wiring polish + docs**
```bash
git add \
  shell/db/seed.ts \
  app/\(dashboard\)/\[slug\]/dashboard/modules/page.tsx \
  docs/superpowers/plans/2026-08-29-turnos-module.md \
  docs/superpowers/specs/2026-08-29-turnos-module-design.md \
  docs/turnos \
  docs/AUDITORIA-TUMO-ARQUITECTURA.md
# solo si modificaste lib/modules.ts o layout icons y no estaban en commits previos:
# lib/modules.ts shell/layouts/dashboard-layout.tsx shell/db/migrate.ts shell/db/migrations/009_turnos.sql

git commit -m "$(cat <<'EOF'
feat(turnos): seed active_modules, docs and admin hub polish

EOF
)"
```

Si un path del ejemplo no existe, saltealo. Si `git status` muestra más archivos **necesarios** de turnos, sumalos al commit que corresponda.  
Si aparece `tests/test-mart-owner.test.ts` u otros no-turnos: **no los metas** salvo que sean del feature y el humano los quiera.

### 3) Push
```bash
git push -u origin feat/turnos-module
```

### 4) PR con gh
```bash
gh pr create --base main --head feat/turnos-module --title "feat(turnos): módulo Turnos (reserva pública + panel admin)" --body "$(cat <<'EOF'
## Summary
- Módulo multi-tenant **Turnos** (`modules/turnos`) cableado al mismo shell admin que Loyalty/Orders (`active_modules`, HomeSection, activity, hub).
- Flujo público: servicio → día → hora → datos → pago transferencia/efectivo → confirmación.
- Dashboard: lista/detalle, ABM servicios, ajustes del módulo (alias/CBU/pausa) — la marca del negocio sigue en Ajustes shell.
- Migración `009_turnos.sql`, seed con `turnos` activo, tests de dominio.

## Architecture
- Thin `app/api/turnos/*` + pages RSC; dominio en `modules/turnos/api` con deps inyectadas.
- Sin imports cruzados a `modules/orders` | `modules/loyalty`.
- Sin MercadoPago en v1.

## Design
- Spec: `docs/superpowers/specs/2026-08-29-turnos-module-design.md`
- Plan: `docs/superpowers/plans/2026-08-29-turnos-module.md`
- Pencil: `design-artifacts/turnos-mvp.pen` (no incluido bak)

## Test plan
- [x] `bun test tests/turnos-*.test.ts`
- [x] `bun test`
- [x] `bun run lint`
- [x] `bun run build`
- [ ] Manual: `/{slug}/turnos` con business que tenga `turnos` en `active_modules`
- [ ] Manual: owner Panel ve sección Turnos; hub Módulos; `/dashboard/turnos`
- [ ] Manual: employee nav muestra Turnos
- [ ] Manual: Ajustes shell (nombre/logo/color) no se duplica dentro de Turnos

## Notes / follow-ups
- (completar: UI tests, brand preview turnos, mirror supabase migration, etc. si quedó deuda)
EOF
)"
```

Si `gh` pide auth y falla, reportá el error y dejá el branch pusheado + el comando PR listo.

---

## Parte C — Report final al humano
1. URL del PR
2. Lista de commits pusheados
3. Resultado real de test/lint/build (pass/fail + números)
4. Archivos **no** incluidos a propósito
5. Deudas abiertas
6. `git status` limpio al final (o qué queda dirty)

## NO hacer
- Nueva rama distinta si `feat/turnos-module` ya es la correcta
- Meter `.pen.bak*` o secrets
- `git add -A`
- Implementar MercadoPago / multi-sillón / seña parcial
- Freestyle fuera de turnos
- Leer o pegar el `.pen` completo (límite de contexto)

Empezá por `git status` + verify; después gaps; después commits → push → `gh pr create`.
