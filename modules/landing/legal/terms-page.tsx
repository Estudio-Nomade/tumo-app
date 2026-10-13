import { LEGAL_MERCHANT } from "./merchant"
import {
  TERMS_EFFECTIVE_DATE,
  TERMS_SECTIONS,
} from "./terms-of-purchase"

function formatEffectiveDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ]
  return `${d} de ${months[m - 1]} de ${y}`
}

export function TermsOfPurchasePage() {
  return (
    <div
      className="min-h-screen bg-[#000000] font-[family-name:var(--font-geist-sans)] text-[#FFFFFF] antialiased"
      style={{
        ["--color-primary" as string]: "#7754E3",
        ["--primary" as string]: "#7754E3",
      }}
    >
      <main className="mx-auto w-full max-w-3xl px-5 py-10 md:py-16">
        <p className="mb-6">
          <a
            href="/"
            className="text-base text-[#A3A3A3] underline-offset-4 transition-colors hover:text-[#FFFFFF] hover:underline"
          >
            ← Volver a Tumo
          </a>
        </p>

        <h1 className="text-[28px] font-extrabold tracking-[-0.03em] text-[#FFFFFF] md:text-4xl">
          Términos y condiciones de compra
        </h1>
        <p className="mt-3 text-base text-[#A3A3A3] md:text-lg">
          Suscripción al servicio SaaS {LEGAL_MERCHANT.productName}. Vigente
          desde {formatEffectiveDate(TERMS_EFFECTIVE_DATE)}.
        </p>

        <section
          aria-labelledby="datos-prestador"
          className="mt-8 rounded-2xl border border-[#262626] bg-[#0A0A0A] p-5 md:p-6"
        >
          <h2
            id="datos-prestador"
            className="text-lg font-semibold text-[#FFFFFF] md:text-xl"
          >
            Datos del prestador / vendedor
          </h2>
          <dl className="mt-4 space-y-2 text-base text-[#D4D4D4]">
            <div>
              <dt className="inline text-[#A3A3A3]">Prestador: </dt>
              <dd className="inline font-medium text-[#FFFFFF]">
                {LEGAL_MERCHANT.legalName}
              </dd>
            </div>
            <div>
              <dt className="inline text-[#A3A3A3]">Documento: </dt>
              <dd className="inline">
                {LEGAL_MERCHANT.documentType} {LEGAL_MERCHANT.documentNumber} (
                {LEGAL_MERCHANT.documentNumberDisplay})
              </dd>
            </div>
            <div>
              <dt className="inline text-[#A3A3A3]">DNI: </dt>
              <dd className="inline">
                {LEGAL_MERCHANT.dniDisplay} ({LEGAL_MERCHANT.dni})
              </dd>
            </div>
            <div>
              <dt className="inline text-[#A3A3A3]">Email: </dt>
              <dd className="inline">
                <a
                  href={`mailto:${LEGAL_MERCHANT.email}`}
                  className="text-[#C4B5FD] underline-offset-4 hover:underline"
                >
                  {LEGAL_MERCHANT.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="inline text-[#A3A3A3]">Web: </dt>
              <dd className="inline">
                <a
                  href={LEGAL_MERCHANT.siteUrl}
                  className="text-[#C4B5FD] underline-offset-4 hover:underline"
                  rel="noopener noreferrer"
                >
                  tumo.com.ar
                </a>
              </dd>
            </div>
          </dl>
        </section>

        <div className="mt-10 flex flex-col gap-8">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-8">
              <h2 className="text-xl font-bold tracking-tight text-[#FFFFFF] md:text-2xl">
                {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-base leading-relaxed text-[#C4C4C4] md:text-lg">
                {(Array.isArray(section.body)
                  ? section.body
                  : [section.body]
                ).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-14 border-t border-[#262626] pt-8 text-sm text-[#A3A3A3]">
          <p>
            Prestador: {LEGAL_MERCHANT.legalName}. Documento:{" "}
            {LEGAL_MERCHANT.documentType} {LEGAL_MERCHANT.documentNumber} (
            {LEGAL_MERCHANT.documentNumberDisplay}). Email:{" "}
            {LEGAL_MERCHANT.email}. Web: {LEGAL_MERCHANT.siteUrl}.
          </p>
        </footer>
      </main>
    </div>
  )
}
