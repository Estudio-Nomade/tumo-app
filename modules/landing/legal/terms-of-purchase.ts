import { formatArsDisplay, PLANS } from "../config"
import { LEGAL_MERCHANT } from "./merchant"

export const TERMS_EFFECTIVE_DATE = "2026-10-13"

export type TermsSection = {
  id: string
  title: string
  body: string | string[]
}

const planList = PLANS.map(
  (p) => `${p.name} ($${formatArsDisplay(p.priceArsMonth)} ARS/mes)`,
).join(", ")

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: "prestador",
    title: "1. Identificación del prestador",
    body: [
      `Estos Términos y condiciones de compra regulan la adquisición de la suscripción al servicio de software ${LEGAL_MERCHANT.productName} ofrecido por:`,
      `Prestador: ${LEGAL_MERCHANT.legalName}`,
      `Documento: ${LEGAL_MERCHANT.documentType} ${LEGAL_MERCHANT.documentNumber} (${LEGAL_MERCHANT.documentNumberDisplay})`,
      `DNI: ${LEGAL_MERCHANT.dniDisplay} (${LEGAL_MERCHANT.dni})`,
      `Email: ${LEGAL_MERCHANT.email}`,
      `Web: ${LEGAL_MERCHANT.siteUrl}`,
      "Los datos anteriores son los mismos con los que el prestador se encuentra registrado como merchant ante el procesador de pagos dLocal GO.",
    ],
  },
  {
    id: "objeto",
    title: "2. Objeto del servicio",
    body: [
      `${LEGAL_MERCHANT.productName} es un software modular en la nube (SaaS) para comercios: acceso a módulos según el plan contratado (por ejemplo Pedidos, Turnos y/o Fidelización), panel de administración y herramientas asociadas al cupo del plan.`,
      "La compra corresponde a una suscripción de acceso al servicio, no a la cesión de código fuente ni a la propiedad intelectual de la plataforma.",
      "El comercio es responsable del uso de la cuenta y de los contenidos, precios y datos que cargue sobre su local y sus clientes.",
    ],
  },
  {
    id: "planes",
    title: "3. Planes y precios",
    body: [
      `Los planes vigentes de referencia son: ${planList}. También pueden publicarse referencias semanales en la web.`,
      "Los precios de la suscripción se publican y cobran en ARS (pesos argentinos).",
      "El importe exacto a debitar es el indicado al momento del checkout o el acordado por el canal de alta. Cualquier promoción o descuento se indicará de forma clara al momento de la compra.",
    ],
  },
  {
    id: "pago",
    title: "4. Medios de pago",
    body: [
      "El pago de la suscripción SaaS se procesa a través de dLocal GO, intermediario de pago. El prestador no almacena datos completos de tarjetas.",
      "Al pagar, el comercio acepta también las condiciones aplicables del procesador en el checkout.",
      "Estos términos se refieren a la compra de la suscripción Tumo. Los cobros que un local reciba de sus propios clientes (por ejemplo pedidos o turnos del comercio) pueden usar otros medios y no se confunden con el cobro de la suscripción SaaS.",
    ],
  },
  {
    id: "activacion",
    title: "5. Activación del servicio",
    body: [
      "Una vez acreditado el pago (o confirmada la alta por el canal acordado), se habilita o se gestiona el acceso a la cuenta del comercio según el plan contratado.",
      "Puede requerirse información mínima del local (nombre, contacto, configuración inicial) para completar el alta.",
      "Si el pago es rechazado o no se completa, no hay obligación de activar el servicio.",
    ],
  },
  {
    id: "renovacion",
    title: "6. Renovación, baja y arrepentimiento",
    body: [
      "La suscripción se renueva según el ciclo indicado al contratar (por ejemplo mensual), salvo baja o impago.",
      "El comercio puede solicitar la baja o no renovación escribiendo a tumo.estudionomade@gmail.com o por WhatsApp al canal publicado en la web, con la mayor anticipación posible antes del próximo ciclo de cobro.",
      "Derecho de arrepentimiento: cuando la normativa argentina aplicable lo permita para compras a distancia, el comercio puede arrepentirse de la compra de la suscripción dentro del plazo legal, contactando al email o WhatsApp indicados. Si el servicio ya fue total o parcialmente prestado a pedido del comercio, pueden aplicarse las excepciones o compensaciones que permita la ley.",
      "Los reembolsos, cuando correspondan, se gestionan por el mismo medio de pago o el que indique el procesador, en plazos razonables.",
    ],
  },
  {
    id: "uso",
    title: "7. Uso aceptable y responsabilidad del comercio",
    body: [
      "El comercio se obliga a usar Tumo de forma lícita, sin vulnerar derechos de terceros ni la normativa aplicable a su rubro.",
      "Es responsable de la veracidad de los datos de su negocio, del trato con sus clientes y de cualquier cobro o entrega propia de su actividad.",
      "No está permitido intentar vulnerar la seguridad de la plataforma, revender el acceso sin autorización ni usar el servicio para fines ilícitos.",
    ],
  },
  {
    id: "disponibilidad",
    title: "8. Disponibilidad y soporte",
    body: [
      "Se procura una disponibilidad razonable del servicio. Pueden existir mantenimientos, incidentes o interrupciones ajenas al prestador (conectividad, terceros, fuerza mayor).",
      "El soporte se brinda por email (tumo.estudionomade@gmail.com) y/o WhatsApp, en horarios de atención habituales, sin garantizar respuesta instantánea 24/7 salvo acuerdo escrito distinto.",
    ],
  },
  {
    id: "limitacion",
    title: "9. Limitación de responsabilidad",
    body: [
      "En la medida permitida por la ley argentina, la responsabilidad del prestador por daños derivados del servicio se limita al monto efectivamente abonado por el comercio en los últimos tres (3) meses de suscripción previos al hecho, salvo dolo o culpa grave.",
      "Tumo es una herramienta de apoyo al comercio; no garantiza resultados de ventas, ocupación ni fidelización.",
      "No se responde por contenidos, precios ni operaciones que el comercio gestione con sus propios clientes a través de los módulos.",
    ],
  },
  {
    id: "ley",
    title: "10. Ley aplicable y jurisdicción",
    body: [
      "Estos términos se rigen por las leyes de la República Argentina.",
      "Para controversias, las partes se someten a los tribunales ordinarios competentes de la República Argentina, sin perjuicio de derechos irrenunciables del consumidor o comercio cuando la ley lo imponga.",
    ],
  },
  {
    id: "contacto",
    title: "11. Contacto",
    body: [
      `Consultas sobre la compra, facturación de la suscripción o estos términos: ${LEGAL_MERCHANT.email}.`,
      `Sitio: ${LEGAL_MERCHANT.siteUrl}`,
      `Prestador: ${LEGAL_MERCHANT.legalName} · ${LEGAL_MERCHANT.documentType} ${LEGAL_MERCHANT.documentNumber} (${LEGAL_MERCHANT.documentNumberDisplay}).`,
    ],
  },
]

export function getTermsPlainText(): string {
  const chunks: string[] = [
    "Términos y condiciones de compra",
    `Vigente desde ${TERMS_EFFECTIVE_DATE}`,
  ]
  for (const section of TERMS_SECTIONS) {
    chunks.push(section.title)
    if (Array.isArray(section.body)) {
      chunks.push(...section.body)
    } else {
      chunks.push(section.body)
    }
  }
  return chunks.join("\n")
}
