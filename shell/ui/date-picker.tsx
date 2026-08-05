"use client"

import { useMemo, useState } from "react"
import { format, parse } from "date-fns"
import { es as esDateFns } from "date-fns/locale"
import { es as esDayPicker } from "react-day-picker/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const ISO = "yyyy-MM-dd"

function toDate(value: string): Date | undefined {
  if (!value) return undefined
  const parsed = parse(value, ISO, new Date())
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function toIso(date: Date): string {
  return format(date, ISO)
}

type DatePickerProps = {
  id?: string
  name?: string
  value: string
  onChange: (isoDate: string) => void
  required?: boolean
  disabled?: boolean
  placeholder?: string
  "aria-labelledby"?: string
  className?: string
}

export default function DatePicker({
  id,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "Elegí una fecha",
  "aria-labelledby": ariaLabelledBy,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => toDate(value), [value])
  const label = selected
    ? format(selected, "d 'de' MMMM yyyy", { locale: esDateFns })
    : null

  return (
    <div className={cn("relative w-full", className)}>
      <input
        id={id ? `${id}-value` : undefined}
        name={name}
        value={value}
        required={required}
        tabIndex={-1}
        readOnly
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        onFocus={(e) => {
          e.currentTarget.blur()
          if (!disabled) setOpen(true)
        }}
        onChange={() => {}}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          aria-labelledby={ariaLabelledBy}
          aria-required={required || undefined}
          data-empty={!selected}
          className={cn(
            "flex h-[52px] w-full items-center justify-between gap-3 rounded-[14px] border border-border bg-background px-4 text-left text-[15px] text-foreground outline-none transition-colors",
            "focus-visible:ring-2 focus-visible:ring-primary/30",
            "data-[empty=true]:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-70"
          )}
        >
          <span className="min-w-0 truncate">{label ?? placeholder}</span>
          <CalendarIcon
            aria-hidden
            className="h-[18px] w-[18px] shrink-0 text-primary"
          />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-auto border-0 p-0 shadow-lg ring-1 ring-stone-200"
        >
          <Calendar
            mode="single"
            locale={esDayPicker}
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected}
            startMonth={new Date(1920, 0)}
            endMonth={new Date()}
            disabled={{ after: new Date() }}
            onSelect={(date) => {
              if (date) {
                onChange(toIso(date))
                setOpen(false)
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
