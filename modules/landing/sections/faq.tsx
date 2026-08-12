import { FAQ_ITEMS } from "../config"
import { LandingAccordion } from "../ui/accordion"

export function FaqSection() {
  return (
    <section
      id="preguntas"
      className="bg-[#000000] px-5 py-16 md:py-24"
      data-landing-craft="faq"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-10 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-4">
          <p className="landing-kicker mb-4">Dudas</p>
          <h2 className="font-[family-name:var(--font-geist-sans)] text-[32px] font-extrabold tracking-[-0.04em] text-[#FFFFFF] md:text-4xl">
            Preguntas
            <span className="mt-1 block text-[#A3A3A3]">de dueño</span>
          </h2>
        </div>
        <div className="md:col-span-8">
          <div className="sr-only">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question}>
                <p>{item.question}</p>
                <p>{item.answer}</p>
              </div>
            ))}
          </div>
          <LandingAccordion items={FAQ_ITEMS} />
        </div>
      </div>
    </section>
  )
}
