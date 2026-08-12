import { MEDIA } from "../config"
import { StockImage } from "../ui/stock-image"
import { ParallaxMedia } from "../ui/parallax-media"

/** Banda editorial full-bleed + parallax desktop */
export function WorkshopSection() {
  return (
    <section
      className="relative bg-[#000000] py-4 md:py-8"
      aria-label="Así laburamos con comercios"
      data-landing-craft="workshop"
    >
      <div className="relative mx-auto w-full max-w-6xl md:px-5">
        <div className="relative aspect-[5/4] w-full overflow-hidden sm:aspect-[16/9] md:aspect-[21/9] md:rounded-[28px]">
          <ParallaxMedia className="absolute inset-0" strength={0.14}>
            <StockImage
              mediaId="workshop"
              src={MEDIA.workshop.src}
              alt={MEDIA.workshop.alt}
              className="absolute inset-0 h-[120%] w-full -top-[10%]"
              imgClassName="scale-105"
            />
          </ParallaxMedia>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, #000000ee 0%, #00000066 45%, #00000033 100%), linear-gradient(0deg, #000000cc 0%, transparent 50%)",
            }}
            aria-hidden
          />
          <div className="absolute inset-x-4 bottom-4 max-w-md md:inset-x-auto md:bottom-8 md:left-8 md:right-auto">
            <div className="rounded-[20px] border border-[#FFFFFF18] bg-[#000000cc] p-5 shadow-[0_20px_50px_#000000aa] backdrop-blur-md md:p-7">
              <p className="landing-kicker mb-3">Oficio</p>
              <p className="font-[family-name:var(--font-geist-sans)] text-2xl font-extrabold leading-snug tracking-tight text-[#FFFFFF] md:text-3xl">
                Tecnología que se adapta a tu mostrador — no al revés.
              </p>
            </div>
          </div>
          <span
            className="landing-index pointer-events-none absolute top-4 right-4 hidden opacity-80 md:block"
            aria-hidden
          >
            01
          </span>
        </div>
      </div>
    </section>
  )
}
