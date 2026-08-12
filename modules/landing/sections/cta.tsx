import { DEFAULT_WA_MESSAGE, MEDIA, whatsappHref } from "../config"
import { LandingButton } from "../ui/button"
import { StockImage } from "../ui/stock-image"

export function CtaSection() {
  return (
    <section
      id="escribinos"
      className="relative overflow-hidden bg-[#000000] px-5 pb-16 md:pb-24"
      data-landing-craft="cta"
    >
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-[#262626]">
        <div className="relative min-h-[380px] md:min-h-[420px]">
          <StockImage
            mediaId="cta"
            src={MEDIA.cta.src}
            alt={MEDIA.cta.alt}
            className="absolute inset-0 h-full w-full"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, #000000f5 0%, #000000d0 40%, #00000088 70%, #7754E344 100%)",
            }}
            aria-hidden
          />
          <div className="landing-mesh absolute inset-0" aria-hidden>
            <div className="landing-mesh__blob landing-mesh__blob--a opacity-40" />
          </div>

          <div className="relative z-10 flex min-h-[380px] flex-col justify-end gap-6 p-7 md:min-h-[420px] md:max-w-xl md:justify-center md:p-12">
            <p className="landing-kicker">Siguiente paso</p>
            <h2 className="font-[family-name:var(--font-geist-sans)] text-[32px] font-extrabold leading-[1.1] tracking-[-0.04em] text-[#FFFFFF] md:text-5xl">
              Si te cierra cómo hablamos, escribinos.
            </h2>
            <p className="text-lg text-[#D4D4D4] md:text-xl">
              Te contestamos por WhatsApp. Sin vueltas.
            </p>
            <LandingButton
              href={whatsappHref(DEFAULT_WA_MESSAGE)}
              className="min-h-[56px] w-full text-lg sm:w-auto sm:min-w-[280px]"
              target="_blank"
              rel="noopener noreferrer"
            >
              Escribinos por WhatsApp
            </LandingButton>
          </div>
        </div>
      </div>
    </section>
  )
}
