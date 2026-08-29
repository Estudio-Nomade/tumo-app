"use client"

type Props = {
  slug: string
  businessName: string
  isPaused?: boolean
}

export default function TurnosEntry({ slug, businessName, isPaused }: Props) {
  if (isPaused) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-4 px-5 py-10 text-center">
        <p className="text-2xl font-bold text-stone-900">
          Por ahora no hay turnos disponibles
        </p>
        <p className="text-base text-stone-600">
          {businessName} pausó las reservas. Probá más tarde.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-6 px-5 py-10 text-center">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white"
        style={{ background: "var(--color-primary, #F97316)" }}
      >
        {businessName.slice(0, 2).toUpperCase()}
      </div>
      <h1 className="text-2xl font-bold text-stone-900">{businessName}</h1>
      <p className="text-base text-stone-600">
        Elegí el servicio, el día y pagá para confirmar tu turno.
      </p>
      <a
        href={`/${slug}/turnos/reservar`}
        className="flex min-h-[56px] w-full items-center justify-center rounded-2xl text-lg font-bold text-white"
        style={{ background: "var(--color-primary, #F97316)" }}
      >
        Reservar un turno
      </a>
    </main>
  )
}
