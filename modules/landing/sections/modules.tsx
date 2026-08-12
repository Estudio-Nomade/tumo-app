import { ORDERS_NOTE, TOOLS } from "../config"
import { Reveal } from "../ui/reveal"

export function ModulesSection() {
  return (
    <section
      id="que-hacemos"
      className="relative overflow-hidden bg-[#000000] px-5 py-16 md:py-24"
      data-landing-craft="tools"
    >
      <div className="landing-mesh pointer-events-none absolute inset-0 opacity-50" aria-hidden>
        <div className="landing-mesh__blob landing-mesh__blob--b" style={{ top: "20%", left: "60%" }} />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="mb-10 grid gap-6 md:mb-14 md:grid-cols-12 md:items-end">
          <Reveal className="md:col-span-7">
            <p className="landing-kicker mb-4">Qué hacemos</p>
            <h2 className="font-[family-name:var(--font-geist-sans)] text-[32px] font-extrabold tracking-[-0.04em] text-[#FFFFFF] md:text-5xl md:leading-[1.05]">
              Laburamos juntos.
              <span className="mt-2 block text-[#A3A3A3]">
                No te dejamos un catálogo.
              </span>
            </h2>
          </Reveal>
          <Reveal className="md:col-span-5" delayMs={80}>
            <p className="text-lg leading-relaxed text-[#A3A3A3] md:text-xl md:text-right">
              Activás lo que usás. Si falta una pieza para tu rubro, la armamos
              y la pagás como un módulo más.
            </p>
          </Reveal>
        </div>

        {/* Bento */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {TOOLS.map((tool, i) => (
            <Reveal
              key={tool.id}
              as="article"
              delayMs={i * 160}
              className={[
                "landing-card-hover landing-frame relative min-h-[220px] overflow-hidden rounded-[24px] p-7 md:min-h-[280px] md:p-9",
                tool.highlighted
                  ? "border border-[#7527E3] bg-gradient-to-br from-[#7754E3] to-[#5B35C9] md:col-span-1"
                  : "landing-card-border border border-[#262626] bg-[#0A0A0A]",
              ].join(" ")}
            >
              <span
                className="landing-index absolute top-4 right-5 opacity-90"
                aria-hidden
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="relative z-10 flex h-full flex-col justify-between gap-8">
                <div>
                  <span
                    className={[
                      "mb-4 inline-flex rounded-full px-3 py-1.5 font-[family-name:var(--font-geist-mono)] text-sm font-medium",
                      tool.highlighted
                        ? "bg-[#FFFFFF22] text-[#FFFFFF]"
                        : "bg-[#7754E322] text-[#C4B5FD]",
                    ].join(" ")}
                  >
                    {tool.statusLabel}
                  </span>
                  <h3 className="font-[family-name:var(--font-geist-sans)] text-2xl font-extrabold tracking-tight text-[#FFFFFF] md:text-3xl">
                    {tool.title}
                  </h3>
                </div>
                <p
                  className={[
                    "max-w-md text-lg leading-relaxed",
                    tool.highlighted ? "text-[#EDE9FE]" : "text-[#A3A3A3]",
                  ].join(" ")}
                >
                  {tool.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-5" delayMs={280}>
          <div className="flex flex-col gap-3 rounded-[20px] border border-dashed border-[#404040] bg-[#080808] px-6 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <p className="text-base leading-relaxed text-[#A3A3A3] md:text-lg">
              <span className="font-semibold text-[#FFFFFF]">Pedidos. </span>
              {ORDERS_NOTE.replace(/^Pedidos por WhatsApp:\s*/i, "")}
            </p>
            <span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-xs tracking-wide text-[#737373]">
              EN CAMINO
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
