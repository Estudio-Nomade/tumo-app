import type { Metadata } from "next"
import { TermsOfPurchasePage } from "@/modules/landing/legal/terms-page"

export const metadata: Metadata = {
  title: "Términos y condiciones de compra | Tumo",
  description:
    "Términos y condiciones de la compra de la suscripción SaaS Tumo. Datos legales del prestador y condiciones de servicio.",
}

export default function TerminosPage() {
  return <TermsOfPurchasePage />
}
