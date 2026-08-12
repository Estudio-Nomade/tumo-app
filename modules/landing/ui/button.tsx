import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react"

type Variant = "primary" | "outline" | "ghost" | "brandOutline"

const variantClass: Record<Variant, string> = {
  primary:
    "landing-btn-shine bg-[#7754E3] text-[#FFFFFF] border border-transparent hover:bg-[#7527E3]",
  outline:
    "bg-[#000000] text-[#FFFFFF] border-[1.5px] border-[#FFFFFF] hover:bg-[#FFFFFF14]",
  ghost:
    "bg-[#FFFFFF18] text-[#FFFFFF] border border-[#FFFFFF55] hover:bg-[#FFFFFF22]",
  brandOutline:
    "bg-[#0A0A0A] text-[#FFFFFF] border-[1.5px] border-[#7754E3] hover:bg-[#7754E322]",
}

type Shared = {
  children: ReactNode
  variant?: Variant
  className?: string
  fullWidth?: boolean
}

type AsLink = Shared &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
  }

type AsButton = Shared &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined
  }

export function LandingButton(props: AsLink | AsButton) {
  const {
    children,
    variant = "primary",
    className = "",
    fullWidth = false,
    ...rest
  } = props

  const classes = [
    "relative inline-flex items-center justify-center overflow-hidden rounded-full",
    "min-h-[52px] px-6 text-base font-semibold leading-none",
    "transition-colors focus-visible:outline focus-visible:outline-2",
    "focus-visible:outline-offset-2 focus-visible:outline-[#7754E3]",
    "text-center",
    variantClass[variant],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  if ("href" in props && props.href) {
    const { href, ...anchorRest } =
      rest as AnchorHTMLAttributes<HTMLAnchorElement>
    return (
      <a href={href} className={classes} {...anchorRest}>
        <span className="relative z-[1]">{children}</span>
      </a>
    )
  }

  return (
    <button
      type={(rest as ButtonHTMLAttributes<HTMLButtonElement>).type ?? "button"}
      className={classes}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      <span className="relative z-[1]">{children}</span>
    </button>
  )
}
