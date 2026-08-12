import type { ModuleStatus } from "../config"

const styles: Record<
  ModuleStatus,
  { wrap: string; text: string }
> = {
  available: {
    wrap: "bg-[#7754E333] border border-[#7754E3]",
    text: "text-[#7754E3]",
  },
  in_progress: {
    wrap: "bg-transparent border border-dashed border-[#A3A3A3]",
    text: "text-[#A3A3A3]",
  },
  custom: {
    wrap: "bg-[#FFFFFF22] border border-[#FFFFFF]",
    text: "text-[#FFFFFF]",
  },
}

export function LandingChip({
  status,
  label,
}: {
  status: ModuleStatus
  label: string
}) {
  const s = styles[status]
  return (
    <span
      className={`inline-flex h-7 shrink-0 items-center rounded-lg px-3 font-[family-name:var(--font-geist-mono)] text-[13px] font-medium tracking-wide ${s.wrap} ${s.text}`}
    >
      {label}
    </span>
  )
}
