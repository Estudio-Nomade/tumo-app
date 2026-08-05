type MetricCardProps = {
  value: string | number
  label: string
  className?: string
}

export default function MetricCard({
  value,
  label,
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-[18px] border border-[#FED7AA] bg-[#FFF7ED] p-3.5 ${className}`}
    >
      <div className="text-[22px] font-extrabold leading-none text-stone-900">
        {value}
      </div>
      <div className="text-[11px] leading-snug text-stone-500">{label}</div>
    </div>
  )
}
