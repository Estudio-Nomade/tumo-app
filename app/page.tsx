import type { Metadata } from "next"
import { LandingPage } from "@/modules/landing/landing-page"
import {
  formatArsDisplay,
  PRICE_FROM_ARS,
} from "@/modules/landing/config"

/** Re-read SELF_SERVICE_SIGNUP each request — avoid baking WA hrefs into static HTML. */
export const dynamic = "force-dynamic"

const metaDescription = `Sistema digital para tu comercio. Planes desde $${formatArsDisplay(PRICE_FROM_ARS)} ARS/mes (Básico 1 módulo · Pro hasta 3 · Full todos). Cobro en pesos.`

export const metadata: Metadata = {
  title: "Tumo — Tecnología que no te frena el negocio",
  description: metaDescription,
  icons: {
    icon: "/landing/tumo-logo-no-text.png",
    apple: "/landing/tumo-logo-no-text.png",
  },
  openGraph: {
    title: "Tumo — Tecnología que no te frena el negocio",
    description: metaDescription,
    type: "website",
    url: "https://tumo.com.ar",
    images: [
      {
        url: "https://tumo.com.ar/landing/tumo-logo-no-text.png",
        width: 1330,
        height: 1182,
        alt: "Tumo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Tumo — Tecnología que no te frena el negocio",
    description: metaDescription,
    images: ["https://tumo.com.ar/landing/tumo-logo-no-text.png"],
  },
}

export default function HomePage() {
  return <LandingPage />
}
