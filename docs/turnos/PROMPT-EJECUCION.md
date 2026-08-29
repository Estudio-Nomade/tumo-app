# PROMPT — Ejecutar / cerrar módulo Turnos (Tumo)

Pegá **solo este archivo** (o decile al agente: leé `docs/turnos/PROMPT-EJECUCION.md` y ejecutá).  
**NO** pegues el `.pen`, ni la auditoría completa, ni chats viejos → revienta el límite de contexto (~1M chars).

---

## Repo
- Path: `/home/marti/Documentos/Estudio Nomade/Tumo`
- Runtime: `export PATH="$HOME/.bun/bin:$PATH"` luego `bun`
- Reglas: `AGENTS.md` (BMAD + TDD + shadcn)
- Arquitectura (hojear §3 wiring módulos): `docs/AUDITORIA-TUMO-ARQUITECTURA.md`
- Spec: `docs/superpowers/specs/2026-08-29-turnos-module-design.md`
- Plan (checkboxes): `docs/superpowers/plans/2026-08-29-turnos-module.md`
- Diseño visual: `design-artifacts/turnos-mvp.pen` — **NO abrir/leer el JSON completo**; si hace falta listar frames, usá un script python corto

## Estado actual (ya existe — NO recrear de cero)

Carpeta de dominio (junto a loyalty/orders):

```
modules/turnos/
  index.ts
  api/        bookings.ts metrics.ts payments.ts services.ts settings.ts
  lib/        availability.ts default-deps.ts types.ts
  public/     entry.tsx booking-wizard.tsx confirmation.tsx
  dashboard/  home-section.tsx panel.tsx services-manager.tsx settings-form.tsx
```

También ya hay (verificar antes de duplicar):
- Registry: `lib/modules.ts` → `turnos: turnosModule`
- Icono: `shell/layouts/dashboard-layout.tsx` → `calendar`
- Migración: `shell/db/migrations/009_turnos.sql` + `migrate.ts`
- Seed: `active_modules` incluye `turnos` en `shell/db/seed.ts`
- API: `app/api/turnos/**`
- Public: `app/(public)/[slug]/turnos/**`
- Dashboard: `app/(dashboard)/[slug]/dashboard/turnos/**`
- Tests dominio: `tests/turnos-*.test.ts` (al último check: **41 pass**)

## Cómo se conecta al panel admin (igual que loyalty/orders)

1. `modules/turnos/index.ts` expone `HomeSection` + `getRecentActivity`
2. Owner **Panel** (`app/(dashboard)/[slug]/dashboard/page.tsx`) apila HomeSections de `getActiveModules`
3. **Actividad** mergea `collectRecentActivity`
4. **Módulos** hub linkea `/{slug}/dashboard/turnos`
5. **Ajustes** shell = solo marca del negocio (nombre/logo/colores) — `shell/ui/settings-form.tsx` — **no** meter config de agenda ahí
6. Config Turnos = `.../dashboard/turnos/servicios` + `.../dashboard/turnos/ajustes`
7. Employee nav: un ítem por módulo activo (label “Turnos”)
8. Brand via CSS vars del layout; módulo no hardcodea paleta
9. `modules/turnos` **nunca** importa loyalty u orders
10. Público gate: `active_modules.includes("turnos")`

## Tu trabajo (continuar, no greenfield)

1. Leer el plan y marcar qué falta (Task 11 seed/polish + commit pendiente).
2. Correr:
   ```bash
   export PATH="$HOME/.bun/bin:$PATH"
   cd "/home/marti/Documentos/Estudio Nomade/Tumo"
   bun test tests/turnos-*.test.ts
   bun test
   bun run lint
   bun run build
   ```
3. Si algo falla: TDD — test que reproduce → fix mínimo → verde.
4. Gaps típicos a revisar (solo si faltan):
   - UI tests en `tests/ui/turnos-*.test.tsx` (plan mencionaba smoke)
   - Detalle de turno: hoy puede vivir en `app/.../turnos/[id]/page.tsx` (server actions); si está crudo vs Pencil D2, pulir sin romper API
   - Hub módulos icons (`gift`/`receipt`/`calendar`) en `modules/page.tsx`
   - Preview “ver como cliente” para turnos en `shell/ui/client-brand-preview-registry.ts` (opcional deuda)
   - `supabase/migrations` mirror de 009 si el proyecto lo usa en cloud
   - Migrar DB local: `bun shell/db/migrate.ts` + seed si hace falta
5. Alinear copy/UX al Pencil **sin** cargar el .pen entero (frames P1–P8, D1–D4, B2 home).
6. Commits conventional `feat(turnos): …` / `fix(turnos): …` — **no push/PR** salvo que el humano lo pida.
7. Actualizar checkboxes del plan al cerrar.

## Producto v1 (locked)
- 1 servicio + 1 slot por reserva
- Pago: transferencia (comprobante) | efectivo en local — **sin MercadoPago**
- Duración del servicio define slots; un calendario
- Independiente de orders
- Elderly-UX; precios en centavos INT

## Done
- [ ] `bun test` verde (suite completa o al menos turnos + modules)
- [ ] `bun run lint` y `bun run build` verdes
- [ ] Con `active_modules` = loyalty+orders+turnos: Panel muestra 3 secciones; hub 3 cards; nav employee 3 ítems; ajustes marca globales intactos; config turnos solo bajo `/dashboard/turnos/*`
- [ ] Plan Task 11 cerrada o deudas listadas
- [ ] Report al humano: qué quedó, URLs de prueba (`/{slug}/turnos`, `/{slug}/dashboard/turnos`), comandos corridos con output real

## NO
- Recrear `modules/turnos` desde cero
- Pegar/leer `turnos-mvp.pen` completo
- Imports entre módulos de dominio
- Brand editor dentro de turnos
- `git add -A` / secretos / force main
