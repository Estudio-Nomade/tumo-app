import type { Metadata } from "next"
import { LandingPage } from "@/modules/landing/landing-page"

export const metadata: Metadata = {
  title: "Tumo — Tecnología que no te frena el negocio",
  description:
    "Armamos el sistema digital de tu comercio y te acompañamos por WhatsApp. Desde $19.900 ARS/mes.",
  icons: {
    icon: "/landing/tumo-logo-no-text.png",
    apple: "/landing/tumo-logo-no-text.png",
  },
  openGraph: {
    title: "Tumo — Tecnología que no te frena el negocio",
    description:
      "Armamos el sistema digital de tu comercio y te acompañamos por WhatsApp. Desde $19.900 ARS/mes.",
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
    description:
      "Armamos el sistema digital de tu comercio y te acompañamos por WhatsApp. Desde $19.900 ARS/mes.",
    images: ["https://tumo.com.ar/landing/tumo-logo-no-text.png"],
  },
}

export default function HomePage() {
  return <LandingPage />
}
