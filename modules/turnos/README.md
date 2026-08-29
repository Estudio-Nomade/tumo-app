# modules/turnos

Módulo de dominio **Turnos** (misma forma que `loyalty` y `orders`).

```
modules/turnos/
  index.ts          # manifiesto turnosModule → lib/modules.ts
  api/              # handlers puros { status, body } + deps
  lib/              # types, default-deps, availability
  public/           # UI cliente (entrada, wizard, confirmación)
  dashboard/        # UI panel (home-section, lista, servicios, ajustes módulo)
```

**No importar** `modules/orders` ni `modules/loyalty`. Solo `shell/`, `lib/`, `components/ui`.

Prompt de continuación para agentes: `docs/turnos/PROMPT-EJECUCION.md`  
Spec: `docs/superpowers/specs/2026-08-29-turnos-module-design.md`  
Plan: `docs/superpowers/plans/2026-08-29-turnos-module.md`  
Pencil (NO leer entero): `design-artifacts/turnos-mvp.pen`
