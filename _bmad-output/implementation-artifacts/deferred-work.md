- source_spec: `_bmad-output/implementation-artifacts/spec-employee-auth.md`
  summary: Phone y maskId viajan en query string del verify (PII en logs/history)
  evidence: login-form navega a /login/verify?maskId&phone; aceptable MVP pero mejorar con sessionStorage o cookie corta

- source_spec: `_bmad-output/implementation-artifacts/spec-employee-auth.md`
  summary: Rate limit in-memory no comparte estado entre instancias ni sobrevive restart
  evidence: Spec lo marca aceptable para MVP; en multi-instance falla el límite

- source_spec: `_bmad-output/implementation-artifacts/spec-employee-auth.md`
  summary: Proxy solo chequea presencia de cookie (tokens forjados/expirados pasan al edge)
  evidence: Spec MVP + layout server ahora valida sesión y business_id; proxy sigue optimistic
