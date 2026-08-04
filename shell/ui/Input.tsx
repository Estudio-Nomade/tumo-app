import type { InputHTMLAttributes } from "react"

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export default function Input({
  label,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? props.name

  return (
    <label className="flex w-full flex-col gap-1.5 text-sm" htmlFor={inputId}>
      <span className="font-medium text-gray-800">{label}</span>
      <input
        id={inputId}
        className={`rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--color-primary,#F97316)] ${className}`}
        {...props}
      />
    </label>
  )
}
