import type { ButtonHTMLAttributes, ReactNode } from "react"

type Variant = "primary" | "outline"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-[var(--color-primary,#F97316)] text-white border border-transparent",
  outline:
    "bg-transparent text-[var(--color-primary,#F97316)] border border-[var(--color-primary,#F97316)]",
}

export default function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-semibold ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
