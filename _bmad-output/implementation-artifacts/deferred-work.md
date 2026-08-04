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
