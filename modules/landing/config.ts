/** TODO: reemplazar por el número real de WhatsApp de Tumo */
export const WHATSAPP_NUMBER = "+54 9 11 0000-0000"

export function whatsappDigits(number = WHATSAPP_NUMBER): string {
  return number.replace(/\D/g, "")
}

export function whatsappHref(message?: string): string {
  const base = `https://wa.me/${whatsappDigits()}`
  if (!message) return base
  return `${base}?text=${encodeURIComponent(message)}`
}

export const DEFAULT_WA_MESSAGE = "Hola, quiero saber más sobre Tumo."

export const PRICE_FROM_ARS = "19.900"

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

/** Dos piezas fuertes; pedidos va como nota humilde aparte */
export const TOOLS: LandingTool[] = [
  {
    id: "loyalty",
    title: "Fidelización",
    statusLabel: "Disponible",
    description:
      "Tarjeta de puntos digital. Tus clientes suman compras, canjean premios y vos sabés quién está por canjear.",
  },
  {
    id: "custom",
    title: "A medida de tu rubro",
    statusLabel: "Lo desarrollamos",
    description:
      "Si te falta una pieza, la armamos sin cobrarte el desarrollo: la pagás como un módulo más.",
    highlighted: true,
  },
]

export const ORDERS_NOTE =
  "Pedidos por WhatsApp: lo estamos armando con comercios. Si te sirve, escribinos y te contamos cómo va."

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
    answer: `Desde $${PRICE_FROM_ARS} ARS por mes, según lo que actives, más un setup único. Te armamos el número para tu comercio.`,
  },
  {
    question: "¿Es difícil de usar?",
    answer:
      "Está pensado para usarlo sin ser experto en tecnología. Te acompañamos por WhatsApp.",
  },
  {
    question: "¿Y si necesito algo que no tienen?",
    answer:
      "Lo desarrollamos sin cobrarte el desarrollo; lo pagás como un módulo más.",
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
