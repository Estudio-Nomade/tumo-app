import type { ReactNode } from "react"

type MetricCardProps = {
  value: string | number
  label: string
  icon?: ReactNode
  trend?: string
  className?: string
  variant?: "default" | "highlight"
}

export default function MetricCard({
  value,
  label,
  icon,
  trend,
  className = "",
  variant = "default",
}: MetricCardProps) {
  const surface =
    variant === "highlight"
      ? "border-[#FDE68A] bg-[#FEF9C3]"
      : "border-[#FED7AA] bg-[#FFF7ED]"

  return (
    <div
      className={`flex flex-col gap-2.5 rounded-[18px] border p-3.5 ${surface} ${className}`}
    >
      {icon || trend ? (
        <div className="flex items-start justify-between gap-2">
          {icon ? (
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-white">
              {icon}
            </div>
          ) : (
            <span />
          )}
          {trend ? (
            <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-sm font-semibold text-[#16A34A]">
              {trend}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="text-[22px] font-extrabold leading-none text-stone-900">
        {value}
      </div>
      <div className="text-base leading-[1.25] text-stone-700">{label}</div>
    </div>
  )
}
