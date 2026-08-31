import { PRICE_PER_MODULE_ARS, whatsappHref } from "../config"
import { LandingButton } from "../ui/button"

export function PricingSection() {
  return (
    <section
      id="precios"
      className="relative overflow-hidden bg-[#000000] px-5 py-16 md:py-24"
      data-landing-craft="pricing"
    >
      <div className="landing-grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-[28px] border border-[#262626] bg-[#0A0A0A]">
          <div className="grid md:grid-cols-5">
            <div className="relative flex flex-col justify-center border-b border-[#262626] p-8 md:col-span-2 md:border-r md:border-b-0 md:p-10">
              <div
                className="pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-[#7754E3] opacity-20 blur-[80px]"
                aria-hidden
              />
              <p className="landing-kicker mb-6">Inversión</p>
              <p className="mt-1 font-[family-name:var(--font-geist-sans)] text-[56px] font-extrabold leading-none tracking-[-0.05em] text-[#FFFFFF] md:text-[64px]">
                ${PRICE_PER_MODULE_ARS}
              </p>
              <p className="mt-2 text-xl font-semibold text-[#7754E3]">
                ARS{" "}
                <span className="font-normal text-[#A3A3A3]">
                  / mes por módulo
                </span>
              </p>
            </div>
            <div className="flex flex-col justify-center gap-6 p-8 md:col-span-3 md:p-10">
              <h2 className="font-[family-name:var(--font-geist-sans)] text-2xl font-extrabold tracking-tight text-[#FFFFFF] md:text-3xl">
                Activás los que uses + un setup único.
              </h2>
              <ul className="flex flex-col gap-3 text-lg text-[#A3A3A3]">
                <li className="flex gap-3">
                  <span className="text-[#7754E3]" aria-hidden>
                    →
                  </span>
                  Sin costos ocultos
                </li>
                <li className="flex gap-3">
                  <span className="text-[#7754E3]" aria-hidden>
                    →
                  </span>
                  Presupuesto armado para tu comercio
                </li>
                <li className="flex gap-3">
                  <span className="text-[#7754E3]" aria-hidden>
                    →
                  </span>
                  Te lo contamos por WhatsApp, sin letra chica
                </li>
              </ul>
              <LandingButton
                href={whatsappHref(
                  `Hola, quiero un presupuesto de Tumo ($${PRICE_PER_MODULE_ARS}/mes por módulo).`
                )}
                className="min-h-[56px] w-full text-lg sm:w-auto sm:min-w-[240px]"
                target="_blank"
                rel="noopener noreferrer"
              >
                Pedí tu presupuesto
              </LandingButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
