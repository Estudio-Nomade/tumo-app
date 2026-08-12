import { CASES } from "../config"
import { StockImage } from "../ui/stock-image"
import { Reveal } from "../ui/reveal"

export function CasesSection() {
  return (
    <section
      id="casos"
      className="bg-[#000000] px-5 py-16 md:py-24"
      data-landing-craft="cases"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <p className="landing-kicker mb-3">Prueba</p>
            <h2 className="font-[family-name:var(--font-geist-sans)] text-[32px] font-extrabold tracking-[-0.04em] text-[#FFFFFF] md:text-5xl">
              Comercios con los
              <span className="mt-1 block text-[#A3A3A3]">que laburamos</span>
            </h2>
          </Reveal>
          <Reveal delayMs={60}>
            <p className="max-w-sm text-lg text-[#A3A3A3] md:text-right">
              Gente de verdad. Todos los días en el mostrador.
            </p>
          </Reveal>
        </div>

        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          {CASES.map((c, i) => (
            <Reveal
              key={c.id}
              as="article"
              delayMs={i * 180}
              className="landing-card-hover group min-w-0"
            >
              <div
                className="relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-[24px] border border-[#262626] md:min-h-[420px]"
                style={{ borderColor: `${c.accent}55` }}
              >
                <StockImage
                  mediaId={`case-${c.id}`}
                  src={c.imageSrc}
                  alt={c.imageAlt}
                  className="absolute inset-0 h-full w-full"
                  imgClassName="transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(0deg, #000000f2 0%, #00000099 45%, transparent 75%), linear-gradient(90deg, ${c.accent}22 0%, transparent 50%)`,
                  }}
                  aria-hidden
                />
                <div className="relative z-10 flex flex-col gap-2 p-6 md:p-8">
                  <span
                    className="mb-1 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 font-[family-name:var(--font-geist-mono)] text-xs tracking-wide"
                    style={{
                      backgroundColor: c.accentSoft,
                      color: c.accentMuted,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: c.accent }}
                    />
                    {c.tag}
                  </span>
                  <p className="font-[family-name:var(--font-geist-sans)] text-3xl font-extrabold tracking-tight text-[#FFFFFF] md:text-4xl">
                    {c.name}
                  </p>
                  <p className="text-lg text-[#D4D4D4]">{c.industry}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
