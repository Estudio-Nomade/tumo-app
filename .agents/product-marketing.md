# Product Marketing Context

**Document version:** v2
**Last updated:** 2026-09-28

## Product Overview
**One-liner:** Tumo arma el sistema digital de tu comercio — tecnología que no te frena el negocio.
**What it does:** Plataforma modular para comercios reales: elegís un plan por cupo de módulos (Fidelización, Pedidos, Turnos; custom si hace falta), pagás online y se crea la cuenta sola. Acompañamiento humano por WhatsApp cuando hace falta; no una app que te deja solo.
**Product category:** Software de gestión / sistema digital para comercios locales (SaaS modular B2B SMB).
**Product type:** SaaS modular multi-tenant (Next.js + Supabase).
**Business model:** Suscripción por **plan de cupo** (no por módulo suelto). Cobro en **ARS (Argentina) vía dLocal**. Precios de lista en USD de referencia:

| Plan | Cupo | USD/mes | USD/sem (ref.) |
|------|------|---------|----------------|
| **Básico** | 1 módulo | 39,99 | ~11,99 |
| **Pro** | hasta 3 módulos | 89,99 | ~25,99 |
| **Full** | todos los módulos | 129,99 | ~36,99 |

- El **mensual sale un toque más barato** que pagar 4 semanas sueltas.
- **Flujo de compra:** eligen plan → pagan (dLocal, ARS) → **se crea la cuenta solos** (self-serve).
- Dominio: tumo.com.ar.
- WhatsApp sigue como soporte / dudas / onboarding humano, **no como único path de cobro**.

## Target Audience
**Target companies:** Comercios físicos y de mostrador en Argentina (gastronomía, belleza/servicios con turnos, retail local, food trucks, locales con retiro). Dueños que ya facturan y sufren caos operativo, no startups.
**Decision-makers:** Dueño/a del local, socio operativo, encargado que decide plata.
**Primary use case:** Ordenar pedidos, turnos o fidelidad sin que la tecnología complique el día a día del local.
**Jobs to be done:**
- Que el cliente pida / reserve / sume puntos sin llamar ni anotar en un cuaderno
- Ver el panel del local en el celular y saber qué está pasando ahora
- Empezar solo (pagar → cuenta lista) y tener a alguien por WA si se traba
**Use cases:**
- Gastronomía: menú digital + pedidos para retirar (Pedidos) → suele arrancar en **Básico**
- Belleza / profesional de servicios: reserva online + aviso WA (Turnos) → **Básico**
- Local que quiere pedidos + puntos o turnos + puntos → **Pro**
- Quiere el stack completo / no pensar en cupos → **Full**
- Rubro sin módulo listo: desarrollo a medida dentro del cupo del plan (custom)

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Dueño de gastro | Menos caos en el turno, pedidos claros, que no se pierda plata | Anota en papel/WhatsApp caótico; apps caras o difíciles | Pedidos en panel; plan Básico o Pro; cuenta en minutos |
| Dueña de servicios (turnos) | Agenda llena, menos “¿tenés lugar?” | Agenda en papel o Instagram DMs | Reserva online + panel; Básico de entrada |
| Dueño que escala el sistema | Varias piezas sin armar Frankenstein | Miedo a pagar de más o quedarse corto | Pro (hasta 3) o Full (todos); upgrade claro |

## Problems & Pain Points
**Core problem:** La tecnología del comercio o no existe, o es un Frankenstein (cuaderno + WA + Excel + app que nadie usa) y el dueño pierde tiempo, pedidos y clientes.
**Why alternatives fall short:**
- Apps genéricas pensadas para cadenas, no para el mostrador argentino
- Implementadores que entregan y desaparecen
- Todo-en-uno caro cuando solo necesitás una pieza
- “Pedí presupuesto por chat” frena a quien solo quiere empezar hoy
**What it costs them:** Pedidos perdidos, turnos no confirmados, clientes que no vuelven, horas de WhatsApp a mano.
**Emotional tension:** “No soy de tecnología”, miedo a gastar al pedo, vergüenza de no entender el sistema, desconfianza de cobros en USD sin claridad en pesos.

## Competitive Landscape
**Direct:** Soft de turnos/pedidos/loyalty locales o latam (apps de reservas, POS con add-ons) — suelen ser rígidos, con soporte frío o packs que no necesitás.
**Secondary:** WhatsApp + cuaderno + Excel / Instagram Shopping improvisado — escala mal y no deja métricas.
**Indirect:** Contratar un dev a medida caro, o “después lo vemos” (no hacer nada).

## Differentiation
**Key differentiators:**
- Planes por **cupo** (1 / hasta 3 / todos): simple de entender y de vender en IG
- **Self-serve:** plan → pago ARS (dLocal) → cuenta creada
- Precio de entrada bajo (**Básico U$S 39,99/mes**) para probar un módulo
- Acompañamiento WA cuando hace falta (no ticket frío)
- Custom posible dentro de la lógica de módulos/cupo
- Hecho con comercios reales (Carri, Defe) y lenguaje de dueño
**How we do it differently:** Taller digital + oficio del mostrador + checkout que no depende de un humano para cobrar.
**Why that's better:** Arranque en minutos, precio predecible, upgrade natural Básico→Pro→Full.
**Why customers choose us:** “Empiezo hoy con uno”, “pago en pesos”, “si crezco sumo módulos sin cambiar de herramienta”.

## Objections
| Objection | Response |
|-----------|----------|
| “Es caro / está en dólares” | Los precios son referencia en USD; **cobramos en ARS** con dLocal. Entrás por Básico (1 módulo) sin armar un pack gigante. |
| “No soy de tecnología” | Flujo simple: elegís plan, pagás, entra la cuenta. Si te trabás, WhatsApp. |
| “Ya tengo WhatsApp / Instagram” | WA/IG siguen para charlar; Tumo ordena pedidos, turnos y puntos que hoy se pierden en el chat. |
| “¿Y si después necesito más módulos?” | Upgrade de plan (Básico → Pro → Full). No tirás lo que ya configuraste. |
| “¿Y si necesito algo que no tienen?” | Custom de rubro: lo charlamos; se encaja en la lógica de módulos/cupo del plan. |
| “¿Por semana o por mes?” | Hay ref. semanal; **el mensual sale un toque más barato** que 4 semanas. |

**Anti-persona:** Cadenas enterprise con procurement largo; quien busca eterno free sin pagar; quien no opera un comercio real.

## Switching Dynamics
**Push:** Caos de mensajes, errores de pedido/turno, clientes que no vuelven, cansancio de anotar a mano.
**Pull:** Elegir plan, pagar en ARS, cuenta lista; panel claro; upgrade cuando crezcas.
**Habit:** “Total con el WhatsApp nos arreglamos”.
**Anxiety:** Pagar y no saber usarlo; elegir mal el plan; “me van a clavar en dólares”.

## Customer Language
**How they describe the problem:**
- “Se me pierde el pedido en el chat”
- “Me escriben todo el día para sacar turno”
- “La tarjeta de sellos no la trae nadie”
- “No tengo tiempo de aprender otra app”
- “Quiero empezar con una cosa sola”
**How they describe us:**
- “Elegí el plan, pagué y ya tenía la cuenta”
- “Empecé con un módulo y después sumé”
- “Laburamos juntos si hace falta”
- “Tecnología que no me frena”
**Words to use:** comercio, mostrador, dueño, plan, cupo, módulo, Básico, Pro, Full, panel, pedidos, turnos, puntos, canje, ARS, pagar online, cuenta lista, WhatsApp (soporte).
**Words to avoid:** sinergia, disruptivo, escalabilidad vacía, onboarding corporativo, “solución integral end-to-end”, “pedí presupuesto” como único CTA de compra, precio viejo 69.99/módulo suelto.
**Glossary:**
| Term | Meaning |
|------|---------|
| Plan Básico / Pro / Full | Cupo de módulos: 1 / hasta 3 / todos |
| Módulo | Pieza activable (Fidelización / Pedidos / Turnos / custom) |
| Cupo | Cuántos módulos entran en el plan |
| dLocal | Medio de cobro; cargo en ARS |
| Self-serve | Pagan → se crea la cuenta sin onboarding comercial obligatorio |
| Carri / Defe | Comercios gastronómicos que trabajan con Tumo |

## Brand Voice
**Tone:** Criollo claro, directo, respetuoso del oficio del dueño. Cercano sin ser infantil.
**Style:** Frases cortas. Beneficio antes que feature. CTA de compra = **elegí tu plan / empezá online**; WA = dudas y soporte. Voseo argentino natural.
**Personality:** Oficioso, compañero de laburo, honesto, anti-humo, práctico.

## Proof Points
**Metrics:** (completar con datos reales: tiempo a primera cuenta, % Básico vs Pro, upgrades).
**Customers:** Carri (gastronómico), Defe (gastronómico).
**Testimonials:** (capturar 2–3 frases verbatim de dueños).
**Value themes:**
| Theme | Proof |
|-------|-------|
| Entrada accesible | Básico U$S 39,99/mes · 1 módulo |
| Escala simple | Pro hasta 3 · Full todos |
| Pago local | ARS vía dLocal |
| Self-serve | Plan → pago → cuenta creada |
| Hecho para el mostrador | Casos Carri / Defe; copy de dueño |

## Goals
**Business goal:** Activar suscripciones pagas (Básico como wedge, Pro como plan dulce, Full para quien quiere todo) vía checkout self-serve.
**Conversion action primaria:** **Elegir plan y pagar** (landing/checkout tumo.com.ar).
**Conversion action secundaria:** WhatsApp para dudas, destrabar onboarding, custom.
**Current metrics:** Landing tumo.com.ar (actualizar pricing en producto); Instagram como adquisición; dLocal + creación de cuenta post-pago.

## Content & channel notes (working)
- Canal social priorizado: **Instagram** (Reels + carruseles + Stories).
- Owned: tumo.com.ar (planes + checkout) + WA soporte.
- Oferta ancla en copy: **planes Básico / Pro / Full** (no “69.99 por módulo”).
- Anclar con Básico (39,99) → contrastar Pro (89,99, mejor valor si van 2–3) → Full (129,99).
- Mostrar ref. semanal para mental accounting; empujar mensual (“sale mejor que 4 semanas”).
- Cobro: **en pesos (ARS), dLocal** — decirlo en FAQ y posts de precio.
- Flujo a enseñar en contenido: **elegís plan → pagás → listo, tu cuenta**.
- No inventar métricas de clientes.

## Changelog
*Newest first. One line per revision: what changed and why.*
- v2 (2026-09-28) — Pricing a planes por cupo (Básico 39,99 / Pro 89,99 / Full 129,99); cobro ARS dLocal; flujo self-serve plan→pago→cuenta; CTA compra deja de ser solo WA presupuesto.
- v1 (2026-09-28) — Initial context desde landing/config módulos (Fidelización, Pedidos, Turnos, custom), pricing legacy por módulo, casos Carri/Defe y voz de marca.
