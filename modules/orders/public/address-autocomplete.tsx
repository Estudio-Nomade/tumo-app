"use client"

import { useEffect, useId, useRef, useState } from "react"

type Suggestion = { label: string; lat: number; lon: number }

type Props = {
  slug: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function AddressAutocomplete({
  slug,
  value,
  onChange,
  placeholder = "Calle y número, barrio",
}: Props) {
  const listId = useId()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const q = value.trim()
    if (q.length < 3) {
      setSuggestions([])
      setOpen(false)
      setLoading(false)
      return
    }

    const timer = window.setTimeout(() => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setLoading(true)
      const url = `/api/orders/geocode?q=${encodeURIComponent(q)}&slug=${encodeURIComponent(slug)}`
      fetch(url, { signal: ac.signal })
        .then(async (res) => {
          if (!res.ok) return { results: [] as Suggestion[] }
          return (await res.json()) as { results?: Suggestion[] }
        })
        .then((json) => {
          const list = Array.isArray(json.results) ? json.results : []
          setSuggestions(list)
          setOpen(list.length > 0)
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return
          setSuggestions([])
          setOpen(false)
        })
        .finally(() => setLoading(false))
    }, 350)

    return () => {
      window.clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [value, slug])

  function pick(s: Suggestion) {
    onChange(s.label)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div className="relative overflow-visible">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true)
        }}
        placeholder={placeholder}
        autoComplete="street-address"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className="min-h-[52px] w-full rounded-2xl border border-[#E7E5E4] px-4 text-base outline-none focus:border-[var(--color-primary,#F97316)]"
      />
      {loading ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted-public,#78716C)]">
          …
        </span>
      ) : null}
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute bottom-full z-40 mb-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-[#E7E5E4] bg-white shadow-lg"
        >
          {suggestions.map((s) => (
            <li key={`${s.label}-${s.lat}-${s.lon}`} role="option">
              <button
                type="button"
                className="flex min-h-[48px] w-full items-center px-4 py-3 text-left text-base text-[var(--color-ink-public,#1C1917)] hover:bg-[#FFF7ED]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
