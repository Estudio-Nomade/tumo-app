import { HOW_IT_WORKS } from "../config"

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="bg-[#000000] px-5 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="mb-3 font-[family-name:var(--font-geist-sans)] text-[28px] font-extrabold tracking-[-0.03em] text-[#FFFFFF] md:text-4xl">
          Cómo funciona
        </h2>
        <p className="mb-8 text-base text-[#A3A3A3]">Tres pasos. Todo encaja.</p>

        {/* Mobile: vertical rail */}
        <ol className="flex flex-col md:hidden">
          {HOW_IT_WORKS.map((item, index) => (
            <li key={item.step} className="flex gap-4">
              <div className="flex w-10 shrink-0 flex-col items-center">
                <div
                  className={[
                    "flex h-10 w-10 items-center justify-center rounded-xl border",
                    index === 0
                      ? "border-[#7754E3] bg-[#7754E3]"
                      : "border-[#262626] bg-[#0A0A0A]",
                  ].join(" ")}
                >
                  <span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold text-[#FFFFFF]">
                    {item.step}
                  </span>
                </div>
                {index < HOW_IT_WORKS.length - 1 ? (
                  <div
                    className="my-1 h-9 w-0.5 rounded bg-[#7754E3]/45"
                    aria-hidden
                  />
                ) : null}
              </div>
              <div
                className={
                  index < HOW_IT_WORKS.length - 1 ? "min-w-0 pb-5 pt-1.5" : "min-w-0 pt-1.5"
                }
              >
                <h3 className="mb-1.5 font-[family-name:var(--font-geist-sans)] text-lg font-bold tracking-tight text-[#FFFFFF]">
                  {item.title}
                </h3>
                <p className="text-base leading-relaxed text-[#A3A3A3]">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* Desktop: 3 columns + connectors */}
        <ol className="hidden md:grid md:grid-cols-3 md:gap-0">
          {HOW_IT_WORKS.map((item, index) => (
            <li key={item.step} className="relative flex flex-col gap-4 px-4 first:pl-0 last:pr-0">
              {index < HOW_IT_WORKS.length - 1 ? (
                <div
                  className="absolute top-5 right-0 left-[calc(2.5rem+1rem)] h-0.5 bg-[#7754E3]/45"
                  aria-hidden
                />
              ) : null}
              <div
                className={[
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-xl border",
                  index === 0
                    ? "border-[#7754E3] bg-[#7754E3]"
                    : "border-[#262626] bg-[#0A0A0A]",
                ].join(" ")}
              >
                <span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold text-[#FFFFFF]">
                  {item.step}
                </span>
              </div>
              <div>
                <h3 className="mb-1.5 font-[family-name:var(--font-geist-sans)] text-lg font-bold tracking-tight text-[#FFFFFF]">
                  {item.title}
                </h3>
                <p className="text-base leading-relaxed text-[#A3A3A3]">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
