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

- source_spec: `_bmad-output/implementation-artifacts/spec-redemptions-ranking-home.md`
  summary: Conteo de canjeadores y ranking de premios no son un snapshot atómico
  evidence: Promise.all lanza dos queries independientes; race rara puede desincronizar header N vs filas

- source_spec: `_bmad-output/implementation-artifacts/spec-redemptions-ranking-home.md`
  summary: Índices en redemptions(business_id) / (business_id, customer_id) para home metrics
  evidence: Home ahora hace COUNT DISTINCT + GROUP BY all-time sobre redemptions además de weekly/month counts

- source_spec: `_bmad-output/implementation-artifacts/spec-redemptions-ranking-home.md`
  summary: Redeem path no-transaccional sesga rankings del home
  evidence: INSERT redemptions + UPDATE purchases=0 sin txn; preexistente, amplificado porque el ledger es headline del Panel


- source_spec: `_bmad-output/implementation-artifacts/spec-owner-qr-programa-pencil.md`
  summary: Descarga/impresión real del QR (PNG/PDF poster)
  evidence: UI dice "Imprimí" y "Próximamente: poster"; sin export aún

- source_spec: `_bmad-output/implementation-artifacts/spec-owner-qr-programa-pencil.md`
  summary: Tests de QR son source-string, no comportamiento render/clipboard
  evidence: branded-qr.test.tsx lee archivos; preexistente en suite UI del repo

- source_spec: `_bmad-output/implementation-artifacts/spec-owner-dashboard-loyalty-ia.md`
  summary: readyCount del hub se estima con getTopCustomers(limit 20), puede subcontar si hay más listos
  evidence: home-section filtra canRedeem sobre top 20 por purchases; en comercios grandes el número de listos puede quedar corto

- source_spec: `_bmad-output/implementation-artifacts/spec-loyalty-qr-scan-points.md`
  summary: GET /api/loyalty/customers por code/phone/id sin auth expone PII; códigos 4 dígitos enumerables
  evidence: Preexistente al feature QR; staff cookie hijack se parcheó; auth en lookup público queda para endurecer

- source_spec: `_bmad-output/implementation-artifacts/spec-loyalty-qr-scan-points.md`
  summary: customers.code es UNIQUE global pero generateCode solo chequea por business_id
  evidence: Preexistente en 001_initial + generate-code; techo ~9k códigos cross-tenant

- source_spec: `_bmad-output/implementation-artifacts/spec-loyalty-qr-scan-points.md`
  summary: Redeem resetea points a 0 (quema excedente sobre points_needed)
  evidence: Comportamiento del spine/intent (canje = reset progreso); multi-premio con remainder es fase futura

- source_spec: `_bmad-output/implementation-artifacts/spec-loyalty-qr-scan-points.md`
  summary: getBusinessById (rangos/umbral) fuera del FOR UPDATE del earn/redeem
  evidence: Race con PATCH program concurrente; mitigado por expectedPoints en earn; tx de business queda para endurecer

- source_spec: `_bmad-output/implementation-artifacts/spec-loyalty-public-onboarding-composition.md`
  summary: Wizard no mueve el foco al H1/primer campo al cambiar de paso
  evidence: setStep desmonta controles; teclado/SR quedan sin ancla; gap preexistente del wizard

- source_spec: `_bmad-output/implementation-artifacts/spec-loyalty-public-onboarding-composition.md`
  summary: Logo con alt vacío si business.name está vacío deja marca sin nombre
  evidence: header usa alt="" + nombre en p; edge de datos de negocio

- source_spec: `_bmad-output/implementation-artifacts/spec-loyalty-public-onboarding-composition.md`
  summary: flex-1 + mt-auto + fixed puede pelear con teclado móvil
  evidence: CTA abajo del viewport al abrir teclado; requiere chequeo en device

- source_spec: `_bmad-output/implementation-artifacts/spec-orders-photon-delivery-remove-mp.md`
  summary: Rate-limit / max length en GET /api/orders/geocode (proxy público Photon)
  evidence: Spec marcó rate-limit como opcional/TODO si trivial; abuso de cuota outbound vía origin sigue posible

- source_spec: `_bmad-output/implementation-artifacts/spec-orders-photon-delivery-remove-mp.md`
  summary: changePaymentMethod no invalida filas order_payments previas al cambiar método
  evidence: Preexistente; review lo re-surfació al quitar MP; transfer↔efectivo puede dejar comprobante huérfano en auditoría
