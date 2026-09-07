"use client"

import {
  DAY_ORDER,
  dayHasMultiWindow,
  normalizeHm,
  type DayEditorState,
  type DayKey,
} from "@/modules/turnos/lib/hours-editor"
import type { HoursMap } from "@/modules/turnos/lib/availability"

type Props = {
  days: Record<DayKey, DayEditorState>
  onChange: (next: Record<DayKey, DayEditorState>) => void
  disabled?: boolean
  originalHours?: HoursMap | null
}

export default function TurnosHoursEditor({
  days,
  onChange,
  disabled,
  originalHours,
}: Props) {
  function update(key: DayKey, patch: Partial<DayEditorState>) {
    const cur = days[key]
    const nextPatch = { ...patch }
    if (patch.open != null) nextPatch.open = normalizeHm(patch.open)
    if (patch.close != null) nextPatch.close = normalizeHm(patch.close)
    onChange({ ...days, [key]: { ...cur, ...nextPatch } })
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-stone-900">
        Días y horarios de atención
      </h2>
      <p className="text-sm text-stone-600">
        Los horarios que cargues acá son la grilla libre. Cuando un cliente
        reserva, ese horario deja de ofrecerse solo.
      </p>
      <ul className="flex flex-col gap-3">
        {DAY_ORDER.map(({ key, label }) => {
          const day = days[key]
          const multi = dayHasMultiWindow(originalHours, key)
          return (
            <li
              key={key}
              className="rounded-2xl border border-stone-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-base font-bold text-stone-900">
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-stone-600">
                    Cerrado
                  </span>
                  <button
                    type="button"
                    role="switch"
                    disabled={disabled}
                    aria-checked={day.closed}
                    aria-label={`${day.closed ? "Abrir" : "Cerrar"} el ${label}`}
                    onClick={() => update(key, { closed: !day.closed })}
                    className={`flex h-[48px] w-16 items-center rounded-full p-1.5 transition disabled:opacity-60 ${
                      day.closed ? "bg-stone-300" : "bg-green-500"
                    }`}
                  >
                    <span
                      className={`h-9 w-9 rounded-full bg-white shadow transition-transform ${
                        day.closed ? "translate-x-0" : "translate-x-4"
                      }`}
                    />
                  </button>
                </div>
              </div>
              {multi && !day.closed ? (
                <p className="mt-2 text-xs text-amber-800">
                  Este día tiene más de una franja. Si lo editás, se guarda una
                  sola.
                </p>
              ) : null}
              {!day.closed ? (
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-sm font-semibold text-stone-600">
                      Abre
                    </span>
                    <input
                      type="time"
                      step={60}
                      disabled={disabled}
                      value={day.open}
                      onChange={(e) => update(key, { open: e.target.value })}
                      className="min-h-[52px] rounded-2xl border border-stone-200 bg-white px-4 text-base text-stone-900 outline-none focus:border-[var(--color-primary,#F97316)]"
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-sm font-semibold text-stone-600">
                      Cierra
                    </span>
                    <input
                      type="time"
                      step={60}
                      disabled={disabled}
                      value={day.close}
                      onChange={(e) => update(key, { close: e.target.value })}
                      className="min-h-[52px] rounded-2xl border border-stone-200 bg-white px-4 text-base text-stone-900 outline-none focus:border-[var(--color-primary,#F97316)]"
                    />
                  </label>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
