import {
  DEFAULT_WA_MESSAGE,
  MEDIA,
  PRICE_PER_MODULE_ARS,
  whatsappHref,
} from "../config"
import { LandingButton } from "../ui/button"
import { StockImage } from "../ui/stock-image"

const TRUST = [
  "Te contestamos por WhatsApp",
  "Setup + acompañamiento",
  "Pagás por lo que usás",
]

export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-[#000000]"
      data-landing-craft="hero"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <StockImage
          mediaId="hero"
          src={MEDIA.hero.src}
          alt=""
          priority
          className="absolute inset-0 h-full w-full opacity-40"
          imgClassName="object-cover object-[center_30%]"
        />
        <div className="landing-mesh">
          <div className="landing-mesh__blob landing-mesh__blob--a" />
          <div className="landing-mesh__blob landing-mesh__blob--b" />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, #000000f0 0%, #000000cc 42%, #00000088 70%, #000000e6 100%)",
          }}
        />
        <div className="landing-grid-bg absolute inset-0 opacity-40" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl gap-6 px-5 py-12 md:grid-cols-12 md:items-end md:gap-8 md:py-24">
        <div className="flex min-w-0 flex-col gap-5 md:col-span-7 md:gap-7 lg:col-span-7">
          <p className="landing-kicker">Comercios reales · WhatsApp</p>
          <h1 className="font-[family-name:var(--font-geist-sans)] text-[34px] font-extrabold leading-[1.08] tracking-[-0.04em] text-[#FFFFFF] sm:text-[42px] md:text-[52px] md:leading-[1.05]">
            <span className="block">No venimos a enseñarte</span>
            <span className="block">el negocio.</span>
            <span className="mt-2 block text-[#A3A3A3] md:mt-3">
              Venimos a que la{" "}
              <span className="text-[#7754E3]">tecnología no te frene</span>.
            </span>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-[#C4C4C4] md:text-xl">
            Armamos el sistema digital de tu comercio y te acompañamos. Vos
            sabés del mostrador. Nosotros de que la tecnología no te complique
            la vida.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <LandingButton
              href={whatsappHref(DEFAULT_WA_MESSAGE)}
              className="min-h-[56px] w-full text-lg sm:w-auto sm:min-w-[260px]"
              target="_blank"
              rel="noopener noreferrer"
            >
              Escribinos por WhatsApp
            </LandingButton>
            <a
              href="#precios"
              className="text-center text-base font-medium text-[#A3A3A3] underline-offset-4 transition-colors hover:text-[#FFFFFF] hover:underline sm:text-left"
            >
              {`Ver $${PRICE_PER_MODULE_ARS} ARS/mes por módulo`}
            </a>
          </div>
        </div>

        {/* Panel: compacto en mobile, amplio en desktop */}
        <div className="md:col-span-5 lg:col-span-5">
          <div className="landing-frame relative overflow-hidden rounded-[20px] border border-[#262626] bg-[#0A0A0A]/90 p-4 shadow-[0_0_60px_#7754E322] backdrop-blur-md sm:p-5 md:rounded-[24px] md:p-8">
            <div className="mb-3 flex items-center justify-between gap-3 md:mb-6 md:items-start md:gap-4">
              <img
                src="/landing/tumo-logo-no-text.png"
                alt=""
                width={56}
                height={50}
                className="h-8 w-auto object-contain opacity-95 md:h-12"
              />
              <span className="rounded-full border border-[#7754E355] bg-[#7754E318] px-2.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] tracking-wide text-[#C4B5FD] md:px-3 md:py-1 md:text-xs">
                tumo.com.ar
              </span>
            </div>
            <p className="mb-3 text-base font-bold leading-snug tracking-tight text-[#FFFFFF] sm:text-lg md:mb-6 md:text-2xl">
              Un taller digital para tu comercio — no una app que te deja solo.
            </p>
            <ul className="flex flex-col gap-2 border-t border-[#262626] pt-3 md:gap-3.5 md:pt-5">
              {TRUST.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-[#D4D4D4] md:gap-3 md:text-lg"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7754E3] shadow-[0_0_10px_#7754E3] md:h-2 md:w-2"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
