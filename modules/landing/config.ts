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

/** Stock editorial (Unsplash). TODO: fotos reales AR. */
export const MEDIA = {
  hero: {
    src: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1600&q=80",
    alt: "Dueño de comercio en su local al atardecer",
  },
  workshop: {
    src: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1600&q=80",
    alt: "Manos trabajando en un mostrador de cocina",
  },
  carri: {
    src: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    alt: "Interior de local gastronómico cálido",
  },
  defe: {
    src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
    alt: "Mesa de restaurante por la noche",
  },
  cta: {
    src: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
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
