import type { Metadata } from "next"
import { LandingPage } from "@/modules/landing/landing-page"
import { PRICE_PER_MODULE_ARS } from "@/modules/landing/config"

const metaDescription = `Armamos el sistema digital de tu comercio y te acompañamos por WhatsApp. $${PRICE_PER_MODULE_ARS} ARS/mes por módulo.`

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
