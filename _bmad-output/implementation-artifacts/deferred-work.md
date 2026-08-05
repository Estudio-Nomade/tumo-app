- source_spec: `_bmad-output/implementation-artifacts/spec-employee-auth.md`
  summary: Phone y maskId viajan en query string del verify (PII en logs/history)
  evidence: login-form navega a /login/verify?maskId&phone; aceptable MVP pero mejorar con sessionStorage o cookie corta

- source_spec: `_bmad-output/implementation-artifacts/spec-employee-auth.md`
  summary: Rate limit in-memory no comparte estado entre instancias ni sobrevive restart
  evidence: Spec lo marca aceptable para MVP; en multi-instance falla el límite

- source_spec: `_bmad-output/implementation-artifacts/spec-employee-auth.md`
  summary: Proxy solo chequea presencia de cookie (tokens forjados/expirados pasan al edge)
  evidence: Spec MVP + layout server ahora valida sesión y business_id; proxy sigue optimistic

- source_spec: `_bmad-output/implementation-artifacts/spec-verify-visual-refactor.md`
  summary: Shell de gradiente brand triplicado entre login-form, verify-form y fallback de page
  evidence: Mismas utilidades Tailwind copiadas; riesgo de drift visual entre pantallas de auth

- source_spec: `_bmad-output/implementation-artifacts/spec-verify-visual-refactor.md`
  summary: Teclado móvil puede empujar OTP bajo el viewport en shell fixed+justify-between
  evidence: overflow-y-auto mitiga pero no usa visualViewport/safe keyboard insets

- source_spec: `_bmad-output/implementation-artifacts/spec-dashboard-visual-refactor.md`
  summary: DashboardLayout acepta employeeName pero layout del dashboard no lo pasa
  evidence: Solo se permiten widgets.tsx y dashboard-layout.tsx; fallback Dueño/Empleado hasta cablear session.name

- source_spec: `_bmad-output/implementation-artifacts/spec-dashboard-visual-refactor.md`
  summary: Tabs mobile icon-only no escalan bien con muchos módulos
  evidence: flex-1 + overflow-x; sin labels visibles (pedido del brief)

- source_spec: `_bmad-output/implementation-artifacts/spec-loyalty-visual-refactor.md`
  summary: Página pública loyalty sigue con wrapper p-4/min-h-60vh mientras card/registro son fixed inset-0
  evidence: app/(public)/[slug]/loyalty/page.tsx fuera de scope del one-shot

- source_spec: `_bmad-output/implementation-artifacts/spec-loyalty-visual-refactor.md`
  summary: shellClassName brand duplicado entre login/verify/card/registration
  evidence: riesgo de drift; conviene extraer helper compartido

- source_spec: `_bmad-output/implementation-artifacts/spec-owner-nav-dashboard-home.md`
  summary: Owner no tiene acceso en nav al panel staff `/dashboard/loyalty`
  evidence: Nav fijo Panel/Actividad/Ajustes omite módulos; ruta loyalty sigue viva

- source_spec: `_bmad-output/implementation-artifacts/spec-owner-nav-dashboard-home.md`
  summary: Business.location tipado pero no se lee de DB
  evidence: getBusiness no SELECT location; UI solo muestra si se hidrata el campo

- source_spec: `_bmad-output/implementation-artifacts/spec-owner-nav-dashboard-home.md`
  summary: Meta/top clientes/trends son mocks sin etiqueta demo
  evidence: Spec permite mocks; riesgo de leerse como datos reales en producción

- source_spec: `_bmad-output/implementation-artifacts/spec-owner-nav-dashboard-home.md`
  summary: Hoy/Ayer del timeline usan TZ del server en RSC
  evidence: groupActivityByDay corre en server; desfase cerca de medianoche vs usuario AR

- source_spec: `_bmad-output/implementation-artifacts/spec-registration-birthday-toggle.md`
  summary: API customers acepta birthday string sin min/max ni validación de formato
  evidence: Preexistente en modules/loyalty/api/customers.ts; el UI nativo type=date no cierra el gap de backend

- source_spec: `_bmad-output/implementation-artifacts/spec-registration-birthday-toggle.md`
  summary: Hit-target del calendar picker depende de ::-webkit-calendar-picker-indicator
  evidence: Solución nativa type=date; Firefox/Safari difieren; no hay date picker custom en el stack

- source_spec: `_bmad-output/implementation-artifacts/spec-shadcn-birthday-datepicker.md`
  summary: globals.css reescrito por shadcn init (tokens, dark, body) sin suite de regresión visual global
  evidence: blast radius de init CLI; DatePicker no es el único consumidor

- source_spec: `_bmad-output/implementation-artifacts/spec-shadcn-birthday-datepicker.md`
  summary: Dual Button primitives (shell/ui/Button vs components/ui/button)
  evidence: Calendar shadcn depende del button de components/ui; shell Button se mantiene para CTAs brand

- source_spec: `_bmad-output/implementation-artifacts/spec-phone-country-prefix.md`
  summary: Login employee sigue mandando phone en query string del verify
  evidence: Preexistente en login-form; fuera del scope del PhoneInput
