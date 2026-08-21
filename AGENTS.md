<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent rules (mandatory)

## BMAD skills are REQUIRED for ALL code work (OBLIGATORIO)

**Cualquier agente que escriba, modifique, refactorice o elimine código de aplicación DEBE usar obligatoriamente las skills de BMAD del proyecto.** No está permitido implementar nada freestyle ni saltarse el workflow de BMAD bajo ninguna circunstancia.

- **Obligatorio**: Siempre cargar e invocar primero la skill BMAD correspondiente (writing-plans, story-implementation, code-review, etc.) antes de tocar cualquier archivo.
- Para loops automáticos de stories usar el orchestrator `bmad-loop` + skills `bmad-loop-*` junto con las primitives de BMM. No bypass.
- Saltarse BMAD aunque parezca “cambio pequeño o obvio” está **prohibido**. Esta regla es mandatory y será verificada en code reviews.

Esta es una regla de hierro del repositorio. Violaciones serán rechazadas inmediatamente.

## Test-Driven Development (TDD) is required

All code changes MUST follow TDD. No implementation without a failing test first.

1. **Red** — write a failing test that describes the desired behavior.
2. **Green** — write the minimum code to make the test pass.
3. **Refactor** — clean up only while tests stay green.

Rules:

- Do not ship untested behavior. New features and bugfixes need automated tests.
- Prefer the project's existing test stack and conventions; do not invent a parallel framework.
- Before claiming done, run the relevant tests and only assert success from real command output.
- If a change cannot be tested automatically, say so explicitly and get human approval before merging — silent exceptions are not allowed.

These rules exist to cut rework and review churn: tested, BMAD-driven changes are the only path for code in this repo.

## Prefer shadcn/ui for complex UI primitives

Do **not** reinvent calendars, date pickers, dialogs, popovers, selects, dropdown menus, sheets, command palettes, or similar interaction-heavy widgets from scratch (or with raw native controls when UX suffers).

- **Prefer shadcn/ui** already installed in this repo (`components.json`, `components/ui/*`, `npx shadcn@latest add <name>`).
- Compose primitives (e.g. Calendar + Popover → DatePicker in `shell/ui/`) rather than building custom pickers.
- Keep brand styling via CSS vars (`--color-primary` / `--primary` set by business layouts). Do not hardcode one-off hex for shared chrome when tokens exist.
- Simple presentational pieces that already live in `shell/ui/` (Button, Input, MetricCard) may stay custom; do not replace them with shadcn unless there is a clear win.
- When adding a new shadcn component: install via CLI, wire brand tokens if needed, and cover the integration with a test following project TDD rules.
