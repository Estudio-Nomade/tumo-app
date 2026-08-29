import type { Business } from "@/lib/modules"

/** Stub until metrics API lands (Task 8). Still a valid HomeSection for registry. */
export async function TurnosHomeSection({
  slug,
  business: _business,
}: {
  slug: string
  business: Business
}) {
  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-[#E7E5E4] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-stone-900">Turnos</h2>
        <a
          href={`/${slug}/dashboard/turnos`}
          className="inline-flex min-h-[48px] items-center text-base font-semibold text-[var(--color-primary,#F97316)]"
        >
          Ver turnos
        </a>
      </div>
      <p className="text-base text-stone-600">Próximamente métricas del día.</p>
    </section>
  )
}
