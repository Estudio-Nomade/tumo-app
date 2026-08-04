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
