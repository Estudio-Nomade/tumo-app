export const WHATSAPP_NUMBER = "+542494512494"

export function whatsappDigits(number = WHATSAPP_NUMBER): string {
  return number.replace(/\D/g, "")
}

export function whatsappHref(message?: string): string {
  const base = `https://wa.me/${whatsappDigits()}`
  if (!message) return base
  return `${base}?text=${encodeURIComponent(message)}`
}

export const DEFAULT_WA_MESSAGE = "Hola, quiero saber más sobre Tumo."

/** Precio de entrada (plan Básico) — hero, SEO, “desde”. */
export const PRICE_FROM_USD = "39.99"

export type LandingPlan = {
  id: "basico" | "pro" | "full"
  name: string
  cupoLabel: string
  priceUsdMonth: string
  priceUsdWeek: string
  blurb: string
  highlighted?: boolean
  waMessage: string
}

/**
 * Planes por cupo (no por módulo suelto).
 * Cobro en ARS vía dLocal cuando el checkout esté live; hoy CTA = WA por plan.
 */
export const PLANS: LandingPlan[] = [
  {
    id: "basico",
    name: "Básico",
    cupoLabel: "1 módulo",
    priceUsdMonth: "39.99",
    priceUsdWeek: "11.99",
    blurb: "Una sola pieza: Pedidos, Turnos o Fidelización.",
    waMessage: "Hola, quiero el plan Básico de Tumo (1 módulo, U$S 39.99/mes).",
  },
  {
    id: "pro",
    name: "Pro",
    cupoLabel: "Hasta 3 módulos",
    priceUsdMonth: "89.99",
    priceUsdWeek: "25.99",
    blurb: "Combiná hasta tres módulos según tu local.",
    highlighted: true,
    waMessage: "Hola, quiero el plan Pro de Tumo (hasta 3 módulos, U$S 89.99/mes).",
  },
  {
    id: "full",
    name: "Full",
    cupoLabel: "Todos los módulos",
    priceUsdMonth: "129.99",
    priceUsdWeek: "36.99",
    blurb: "Todo el stack. Sin pensar en cupos.",
    waMessage: "Hola, quiero el plan Full de Tumo (todos los módulos, U$S 129.99/mes).",
  },
]

/**
 * Media servida desde /public (mismo origen en Vercel).
 * Evita hotlink externo + bug de onLoad con cache.
 * TODO: reemplazar por fotos reales AR.
 */
export const MEDIA = {
  hero: {
    src: "/landing/media/hero.jpg",
    alt: "Dueño de comercio en su local al atardecer",
  },
  workshop: {
    src: "/landing/media/workshop.jpg",
    alt: "Manos trabajando en un mostrador de cocina",
  },
  carri: {
    src: "/landing/media/carri.jpg",
    alt: "Interior de local gastronómico cálido",
  },
  defe: {
    src: "/landing/media/defe.jpg",
    alt: "Mesa de restaurante por la noche",
  },
  cta: {
    src: "/landing/media/cta.jpg",
    alt: "Fachada de comercio con luces",
  },
} as const

export type LandingTool = {
  id: string
  title: string
  statusLabel: string
  description: string
  highlighted?: boolean
}

/** Módulos de catálogo + custom a medida */
export const TOOLS: LandingTool[] = [
  {
    id: "loyalty",
    title: "Fidelización",
    statusLabel: "Disponible",
    description:
      "Tarjeta de puntos digital. Tus clientes suman compras, canjean premios y vos sabés quién está por canjear.",
  },
  {
    id: "orders",
    title: "Pedidos",
    statusLabel: "Disponible",
    description:
      "Menú digital, carrito y pedido para retirar. El cliente elige, paga por transferencia o en el local, y vos lo ves en el panel.",
  },
  {
    id: "turnos",
    title: "Turnos",
    statusLabel: "Disponible",
    description:
      "Reserva online por el cliente, servicios con duración y precio, panel del local, pago por transferencia o en el local, y aviso por WhatsApp.",
  },
  {
    id: "custom",
    title: "A medida de tu rubro",
    statusLabel: "Lo desarrollamos",
    description:
      "Si te falta una pieza, la armamos sin cobrarte el desarrollo: entra en el cupo de tu plan.",
    highlighted: true,
  },
]

export type CaseStudy = {
  id: string
  name: string
  industry: string
  tag: string
  accent: string
  accentSoft: string
  accentMuted: string
  imageSrc: string
  imageAlt: string
}

export const CASES: CaseStudy[] = [
  {
    id: "carri",
    name: "Carri",
    industry: "Gastronómico",
    tag: "trabaja con Tumo",
    accent: "#F97316",
    accentSoft: "#F9731614",
    accentMuted: "#FACC15",
    imageSrc: MEDIA.carri.src,
    imageAlt: MEDIA.carri.alt,
  },
  {
    id: "defe",
    name: "Defe",
    industry: "Gastronómico",
    tag: "trabaja con Tumo",
    accent: "#577e99",
    accentSoft: "#577e9914",
    accentMuted: "#84a7c2",
    imageSrc: MEDIA.defe.src,
    imageAlt: MEDIA.defe.alt,
  },
]

export type FaqItem = {
  question: string
  answer: string
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "¿Cuánto sale?",
    answer:
      "Tres planes por cupo (ref. USD/mes): Básico U$S 39.99 (1 módulo), Pro U$S 89.99 (hasta 3) y Full U$S 129.99 (todos). También hay ref. semanal (~11.99 / ~25.99 / ~36.99); el mensual sale un toque mejor que 4 semanas. El cobro es en ARS (pesos). Te armamos el alta por WhatsApp.",
  },
  {
    question: "¿Cómo empiezo?",
    answer:
      "Elegís el plan (Básico, Pro o Full), nos escribís por WhatsApp y te activamos la cuenta. Cuando el pago online esté live: elegís plan → pagás en ARS → se crea la cuenta.",
  },
  {
    question: "¿Es difícil de usar?",
    answer:
      "Está pensado para usarlo sin ser experto en tecnología. Te acompañamos por WhatsApp.",
  },
  {
    question: "¿Y si necesito algo que no tienen?",
    answer:
      "Lo desarrollamos sin cobrarte el desarrollo; entra en el cupo de tu plan como un módulo más.",
  },
  {
    question: "¿Qué pasa si no entiendo algo?",
    answer: "Te contestamos por WhatsApp desde el primer día.",
  },
]

export const NAV_LINKS = [
  { href: "#que-hacemos", label: "Qué hacemos" },
  { href: "#casos", label: "Casos" },
  { href: "#precios", label: "Precios" },
  { href: "#escribinos", label: "Escribinos" },
] as const
