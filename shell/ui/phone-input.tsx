"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AsYouType, type CountryCode } from "libphonenumber-js"
import { ChevronsUpDown } from "lucide-react"
import {
  composePhoneE164,
  filterCountries,
  flagEmoji,
  parsePhoneParts,
  type CountryOption,
} from "@/lib/countries"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type PhoneInputProps = {
  id?: string
  name?: string
  label?: string
  value: string
  onChange: (e164: string) => void
  required?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
  defaultCountry?: CountryCode
}

export default function PhoneInput({
  id = "phone",
  name = "phone",
  label = "WhatsApp",
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "9 11 1234-5678",
  className,
  defaultCountry = "AR",
}: PhoneInputProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const lastEmitted = useRef(value)

  const seed = parsePhoneParts(value, defaultCountry)
  const [country, setCountry] = useState<CountryCode>(
    value ? seed.country : defaultCountry
  )
  const [national, setNational] = useState(seed.nationalDigits)

  useEffect(() => {
    if (value === lastEmitted.current) return
    lastEmitted.current = value
    if (!value) {
      setNational("")
      return
    }
    const parts = parsePhoneParts(value, defaultCountry)
    setCountry(parts.country)
    setNational(parts.nationalDigits)
  }, [value, defaultCountry])

  const countries = useMemo(() => filterCountries(query), [query])
  const selected: CountryOption | undefined = useMemo(() => {
    const all = filterCountries("")
    return all.find((c) => c.iso2 === country) ?? all[0]
  }, [country])

  const displayNational = useMemo(() => {
    if (!national) return ""
    return new AsYouType(country).input(national)
  }, [national, country])

  function emit(nextCountry: CountryCode, nextNational: string) {
    const e164 = composePhoneE164(nextCountry, nextNational)
    lastEmitted.current = e164
    onChange(e164)
  }

  function pickCountry(next: CountryCode) {
    setCountry(next)
    setOpen(false)
    setQuery("")
    emit(next, national)
  }

  function onNationalChange(raw: string) {
    const trimmed = raw.trim()
    if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
      const parts = parsePhoneParts(trimmed, country)
      setCountry(parts.country)
      setNational(parts.nationalDigits)
      emit(parts.country, parts.nationalDigits)
      return
    }
    const digits = raw.replace(/\D/g, "")
    setNational(digits)
    emit(country, digits)
  }

  return (
    <div className={cn("flex w-full flex-col gap-1.5 text-sm", className)}>
      {label ? (
        <span id={`${id}-label`} className="font-medium text-stone-900">
          {label}
        </span>
      ) : null}
      <input type="hidden" name={name} value={value} readOnly />
      <div className="flex h-[52px] w-full items-stretch overflow-hidden rounded-[14px] bg-[#F5F5F4] focus-within:ring-2 focus-within:ring-primary/30">
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) setQuery("")
          }}
        >
          <PopoverTrigger
            type="button"
            disabled={disabled}
            aria-label={`País ${selected?.name ?? country}, prefijo +${selected?.dialCode ?? ""}`}
            className="flex shrink-0 items-center gap-1 border-0 border-r border-border/60 bg-transparent px-3 text-[15px] text-stone-900 outline-none hover:bg-stone-200/50 disabled:opacity-70"
          >
            <span className="text-lg leading-none" aria-hidden>
              {selected?.flag ?? flagEmoji(country)}
            </span>
            <span className="font-medium tabular-nums">
              +{selected?.dialCode}
            </span>
            <ChevronsUpDown
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden
            />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-[min(100vw-2rem,320px)] border-0 p-0 shadow-lg ring-1 ring-stone-200"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Buscar país o prefijo…"
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                <CommandEmpty>No encontramos ese país.</CommandEmpty>
                <CommandGroup>
                  {countries.map((c) => (
                    <CommandItem
                      key={c.iso2}
                      value={`${c.name} ${c.iso2} +${c.dialCode}`}
                      data-checked={c.iso2 === country || undefined}
                      onSelect={() => pickCountry(c.iso2)}
                    >
                      <span className="text-base" aria-hidden>
                        {c.flag}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        +{c.dialCode}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          aria-labelledby={label ? `${id}-label` : undefined}
          value={displayNational}
          onChange={(e) => onNationalChange(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 text-base text-stone-900 outline-none placeholder:text-[#A8A29E] disabled:opacity-70"
        />
      </div>
    </div>
  )
}
