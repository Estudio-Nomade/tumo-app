import { PLANS, whatsappHref } from "../config"
import { LandingButton } from "../ui/button"

export function PricingSection() {
  return (
    <section
      id="precios"
      className="relative overflow-hidden bg-[#000000] px-5 py-16 md:py-24"
      data-landing-craft="pricing"
    >
      <div className="landing-grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-10 max-w-2xl md:mb-12">
          <p className="landing-kicker mb-4">Inversión</p>
          <h2 className="font-[family-name:var(--font-geist-sans)] text-[32px] font-extrabold tracking-[-0.04em] text-[#FFFFFF] md:text-5xl">
            Planes por cupo
            <span className="mt-2 block text-[#A3A3A3]">
              no por módulo suelto
            </span>
          </h2>
          <p className="mt-4 text-lg text-[#A3A3A3] md:text-xl">
            Elegís cuántos módulos necesitás. Cobro en ARS (pesos). El mensual
            sale un toque mejor que pagar 4 semanas.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={[
                "landing-frame relative flex flex-col overflow-hidden rounded-[24px] border p-6 md:p-8",
                plan.highlighted
                  ? "border-[#7527E3] bg-gradient-to-br from-[#7754E3] to-[#5B35C9]"
                  : "border-[#262626] bg-[#0A0A0A]",
              ].join(" ")}
            >
              {plan.highlighted ? (
                <span className="mb-4 inline-flex w-fit rounded-full bg-[#FFFFFF22] px-3 py-1 font-[family-name:var(--font-geist-mono)] text-xs tracking-wide text-[#FFFFFF]">
                  Más elegido
                </span>
              ) : (
                <span className="mb-4 inline-flex w-fit rounded-full bg-[#7754E322] px-3 py-1 font-[family-name:var(--font-geist-mono)] text-xs tracking-wide text-[#C4B5FD]">
                  Plan
                </span>
              )}
              <h3
                className={[
                  "font-[family-name:var(--font-geist-sans)] text-2xl font-extrabold tracking-tight md:text-3xl",
                  plan.highlighted ? "text-[#FFFFFF]" : "text-[#FFFFFF]",
                ].join(" ")}
              >
                {plan.name}
              </h3>
              <p
                className={[
                  "mt-1 text-base font-medium",
                  plan.highlighted ? "text-[#EDE9FE]" : "text-[#C4B5FD]",
                ].join(" ")}
              >
                {plan.cupoLabel}
              </p>
              <p className="mt-6 font-[family-name:var(--font-geist-sans)] text-[40px] font-extrabold leading-none tracking-[-0.04em] text-[#FFFFFF] md:text-[44px]">
                ${plan.priceUsdMonth}
              </p>
              <p
                className={[
                  "mt-2 text-base",
                  plan.highlighted ? "text-[#EDE9FE]" : "text-[#A3A3A3]",
                ].join(" ")}
              >
                USD / mes
                <span className="mt-1 block text-sm opacity-90">
                  o ~${plan.priceUsdWeek} USD / sem
                </span>
              </p>
              <p
                className={[
                  "mt-5 flex-1 text-base leading-relaxed",
                  plan.highlighted ? "text-[#EDE9FE]" : "text-[#A3A3A3]",
                ].join(" ")}
              >
                {plan.blurb}
              </p>
              <LandingButton
                href={whatsappHref(plan.waMessage)}
                className={[
                  "mt-8 min-h-[52px] w-full text-base",
                  plan.highlighted
                    ? "bg-[#FFFFFF] text-[#5B35C9] hover:bg-[#F5F5F5]"
                    : "",
                ].join(" ")}
                target="_blank"
                rel="noopener noreferrer"
              >
                Quiero {plan.name}
              </LandingButton>
            </article>
          ))}
        </div>

        <ul className="mt-8 flex flex-col gap-2 text-base text-[#A3A3A3] md:mt-10 md:flex-row md:flex-wrap md:gap-x-8 md:gap-y-2 md:text-lg">
          <li className="flex gap-2">
            <span className="text-[#7754E3]" aria-hidden>
              →
            </span>
            Cobro en ARS (pesos)
          </li>
          <li className="flex gap-2">
            <span className="text-[#7754E3]" aria-hidden>
              →
            </span>
            Módulos: Pedidos · Turnos · Fidelización
          </li>
          <li className="flex gap-2">
            <span className="text-[#7754E3]" aria-hidden>
              →
            </span>
            Sin letra chica · te acompañamos por WhatsApp
          </li>
        </ul>
      </div>
    </section>
  )
}
