"use client"

import {
  DAY_ORDER,
  defaultWindow,
  normalizeHm,
  type DayEditorState,
  type DayKey,
  type WindowEditor,
} from "@/modules/turnos/lib/hours-editor"

type Props = {
  days: Record<DayKey, DayEditorState>
  onChange: (next: Record<DayKey, DayEditorState>) => void
  disabled?: boolean
}

export default function TurnosHoursEditor({ days, onChange, disabled }: Props) {
  function setDay(key: DayKey, day: DayEditorState) {
    onChange({ ...days, [key]: day })
  }

  function toggleClosed(key: DayKey) {
    const cur = days[key]
    if (cur.closed) {
      setDay(key, {
        closed: false,
        windows: cur.windows?.length ? cur.windows : [defaultWindow()],
      })
    } else {
      setDay(key, { closed: true, windows: cur.windows?.length ? cur.windows : [defaultWindow()] })
    }
  }

  function updateWindow(
    key: DayKey,
    index: number,
    patch: Partial<WindowEditor>
  ) {
    const cur = days[key]
    const windows = (cur.windows ?? [defaultWindow()]).map((w, i) => {
      if (i !== index) return w
      return {
        open: patch.open != null ? normalizeHm(patch.open) : w.open,
        close: patch.close != null ? normalizeHm(patch.close) : w.close,
      }
    })
    setDay(key, { ...cur, closed: false, windows })
  }

  function addWindow(key: DayKey) {
    const cur = days[key]
    const windows = [...(cur.windows ?? [defaultWindow()]), defaultWindow()]
    setDay(key, { closed: false, windows })
  }

  function removeWindow(key: DayKey, index: number) {
    const cur = days[key]
    const windows = (cur.windows ?? []).filter((_, i) => i !== index)
    if (windows.length === 0) {
      setDay(key, { closed: true, windows: [defaultWindow()] })
      return
    }
    setDay(key, { ...cur, windows })
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-stone-900">
        Días y horarios de atención
      </h2>
      <p className="text-sm text-stone-600">
        Los horarios que cargues acá son la grilla libre. Cuando un cliente
        reserva, ese horario deja de ofrecerse solo. Podés sumar varias franjas
        el mismo día (ej. 9–12, 13–15 y 16–20).
      </p>
      <ul className="flex flex-col gap-3">
        {DAY_ORDER.map(({ key, label }) => {
          const day = days[key]
          const windows = day.windows?.length ? day.windows : [defaultWindow()]
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
                    onClick={() => toggleClosed(key)}
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
              {!day.closed ? (
                <div className="mt-3 flex flex-col gap-3">
                  {windows.map((w, wi) => (
                    <div
                      key={`${key}-${wi}`}
                      className="flex flex-col gap-2 rounded-xl border border-stone-100 bg-stone-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-stone-700">
                          Franja {wi + 1}
                        </span>
                        {windows.length > 1 ? (
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => removeWindow(key, wi)}
                            className="min-h-[40px] rounded-lg px-2 text-sm font-semibold text-red-700 disabled:opacity-60"
                          >
                            Quitar
                          </button>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <label className="flex flex-1 flex-col gap-1.5">
                          <span className="text-sm font-semibold text-stone-600">
                            Abre
                          </span>
                          <input
                            type="time"
                            step={60}
                            disabled={disabled}
                            value={w.open}
                            onChange={(e) =>
                              updateWindow(key, wi, { open: e.target.value })
                            }
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
                            value={w.close}
                            onChange={(e) =>
                              updateWindow(key, wi, { close: e.target.value })
                            }
                            className="min-h-[52px] rounded-2xl border border-stone-200 bg-white px-4 text-base text-stone-900 outline-none focus:border-[var(--color-primary,#F97316)]"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => addWindow(key)}
                    className="min-h-[48px] rounded-xl border border-dashed border-stone-300 px-3 text-sm font-semibold text-stone-700 disabled:opacity-60"
                  >
                    Agregar franja
                  </button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
