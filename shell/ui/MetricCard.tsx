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
      className={`flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}
    >
      <div className="text-3xl font-extrabold text-gray-800">{value}</div>
      <div className="mt-1 text-sm text-gray-500">{label}</div>
    </div>
  )
}
