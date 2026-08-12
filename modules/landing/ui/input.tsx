import type { InputHTMLAttributes } from "react"

export function LandingInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={[
        "h-[52px] w-full rounded-[14px] border border-[#262626]",
        "bg-[#0A0A0A] px-4 text-base text-[#FFFFFF]",
        "placeholder:text-[#737373]",
        "focus-visible:outline focus-visible:outline-2",
        "focus-visible:outline-offset-2 focus-visible:outline-[#7754E3]",
        className,
      ].join(" ")}
      {...props}
    />
  )
}
